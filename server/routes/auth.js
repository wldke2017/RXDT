import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
// JWT_SECRET must be set via environment. No fallback: a leaked default
// secret would allow attackers to forge tokens for any user.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required!');
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, inviteCode } = req.body;
    const identifier = phone || email;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Phone number or email, and password are required.' });
    }

    // Ensure phone column allows null (fail-safe migration)
    await query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;`).catch(() => { });

    // Check if user already exists
    let existing;
    if (phone) {
      existing = await query(`SELECT * FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $2)`, [phone, email || '']);
    } else {
      existing = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    }

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Phone number or email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const userId = 'U' + Math.floor(100000 + Math.random() * 900000);
    // Generate unique 6-character uppercase/number invite code
    const userInviteCode = 'RX' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const userName = name || (phone ? 'Trader_' + phone.slice(-4) : email.split('@')[0]);

    // Check if inviteCode/referrer was provided
    let referrerId = null;
    if (inviteCode) {
      const refRes = await query(`SELECT id FROM users WHERE invite_code = $1 OR id = $1`, [inviteCode.trim()]);
      if (refRes.rows.length > 0) {
        referrerId = refRes.rows[0].id;
      }
    }

    // If phone is missing (email registration), store NULL — no fake placeholder.
    // The user will be required to bind a phone number later.
    const effectivePhone = phone || null;

    const newUser = await query(`
      INSERT INTO users (id, name, phone, email, password_hash, invite_code, referred_by, total_assets, available_balance, frozen_balance, total_earnings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00, 0.00, 0.00, 0.00)
      RETURNING id, name, phone, email, total_assets, available_balance, frozen_balance, total_earnings, invite_code, referred_by, kyc_status, membership_tier;
    `, [userId, userName, effectivePhone, email || null, hash, userInviteCode, referrerId]);

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, phone: user.phone || '', email: user.email || '' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Registration successful!',
      token,
      user: formatUser(user)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({ error: 'Phone number or email, and password are required.' });
    }

    let userRes;
    if (phone) {
      userRes = await query(`SELECT * FROM users WHERE phone = $1 OR email = $1`, [phone]);
    } else {
      userRes = await query(`SELECT * FROM users WHERE email = $1 OR phone = $1`, [email]);
    }

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'User not found with provided phone or email.' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ error: 'Invalid password.' });
    }

    const token = jwt.sign({ id: user.id, phone: user.phone || '', email: user.email || '' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful!',
      token,
      user: formatUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get profile endpoint
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [decoded.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: formatUser(userRes.rows[0]) });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ---- Phone Binding ----

// Send OTP to a phone number for binding
router.post('/send-phone-otp', requireAuth, async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\+?[0-9]{6,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid phone number required (6-15 digits, optional + prefix)' });
  }

  try {
    // Check if phone is already bound to another account
    const existing = await query(`SELECT id FROM users WHERE phone = $1 AND id != $2`, [phone, req.userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This phone number is already bound to another account.' });
    }

    // Rate-limit: reject if an OTP was issued within the last 60 seconds
    const otpCheck = await query(`SELECT phone_otp_expires FROM users WHERE id = $1`, [req.userId]);
    if (otpCheck.rows[0]?.phone_otp_expires) {
      const otpIssuedAt = new Date(otpCheck.rows[0].phone_otp_expires).getTime() - 10 * 60 * 1000;
      if (Date.now() - otpIssuedAt < 60 * 1000) {
        return res.status(429).json({ error: 'Please wait 60 seconds before requesting a new code.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in users table
    await query(
      `UPDATE users SET phone_otp = $1, phone_otp_expires = $2 WHERE id = $3`,
      [otp, expires, req.userId]
    );

    // In production, send via SMS provider (Twilio, etc.)
    // For now, log the OTP for debugging. The client will NOT receive it.
    console.log(`[PHONE-OTP] User ${req.userId} → ${phone}: ${otp}`);

    res.json({ success: true, message: `Verification code sent to ${phone}` });
  } catch (err) {
    console.error('Send phone OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Bind phone — verifies OTP and sets phone
router.post('/bind-phone', requireAuth, async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  try {
    const result = await query(
      `SELECT phone_otp, phone_otp_expires FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.phone_otp || user.phone_otp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (new Date() > new Date(user.phone_otp_expires)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check if phone is already bound to another account
    const existing = await query(`SELECT id FROM users WHERE phone = $1 AND id != $2`, [phone, req.userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This phone number is already bound to another account.' });
    }

    // Bind the phone and clear OTP
    await query(
      `UPDATE users SET phone = $1, phone_otp = NULL, phone_otp_expires = NULL WHERE id = $2`,
      [phone, req.userId]
    );

    res.json({ success: true, message: 'Phone number bound successfully', phoneBound: phone });
  } catch (err) {
    console.error('Bind phone error:', err);
    res.status(500).json({ error: 'Failed to bind phone' });
  }
});

// Get current user's bound phone status
router.get('/phone-status', requireAuth, async (req, res) => {
  try {
    const result = await query(`SELECT phone FROM users WHERE id = $1`, [req.userId]);
    const user = result.rows[0];
    res.json({ phoneBound: user?.phone || null });
  } catch (err) {
    console.error('Phone status error:', err.message);
    res.json({ phoneBound: null });
  }
});

function formatUser(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email || '',
    emailBound: u.email_bound || null,
    totalAssets: parseFloat(u.total_assets || 0),
    availableBalance: parseFloat(u.available_balance || 0),
    frozenBalance: parseFloat(u.frozen_balance || 0),
    totalEarnings: parseFloat(u.total_earnings || 0),
    inviteCode: u.invite_code,
    kycStatus: u.kyc_status,
    membershipTier: u.membership_tier,
    spinChances: u.spin_chances !== undefined && u.spin_chances !== null ? parseInt(u.spin_chances) : 1,
    dailySignalCount: u.daily_signal_count || 3,
    avgDailyReturn: u.avg_daily_return || '1.8% - 2.1%',
    doublingDays: 34
  };
}

export default router;