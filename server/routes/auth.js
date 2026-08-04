import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { processDueSignalTrades } from './signals.js';

const router = express.Router();

// Rate limiting to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // max 10 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' }
});
// JWT_SECRET must be set via environment. No fallback: a leaked default
// secret would allow attackers to forge tokens for any user.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required!');
}

// Register endpoint
router.post('/register', registerLimiter, async (req, res) => {
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

    // Referral reward: when user A refers user B, BOTH get 1 free trading signal
    // credit (usable at the 8pm automatic signal). The new user gets 1 credit,
    // and the referrer gets 1 credit.
    const newUserFreeCredits = referrerId ? 1 : 0;

    const newUser = await query(`
      INSERT INTO users (id, name, phone, email, password_hash, invite_code, referred_by, total_assets, available_balance, frozen_balance, total_earnings, free_signal_credits)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00, 0.00, 0.00, 0.00, $8)
      RETURNING id, name, phone, email, total_assets, available_balance, frozen_balance, total_earnings, invite_code, referred_by, kyc_status, membership_tier, free_signal_credits;
    `, [userId, userName, effectivePhone, email || null, hash, userInviteCode, referrerId, newUserFreeCredits]);

    // If the new user was referred, also grant the referrer 1 free signal credit
    if (referrerId) {
      await query(
        `UPDATE users SET free_signal_credits = free_signal_credits + 1 WHERE id = $1`,
        [referrerId]
      );
    }

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
router.post('/login', loginLimiter, async (req, res) => {
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

    // Release any signal trades whose release_at has passed so the
    // frozen ("In Orders") balance is credited back to available balance.
    await processDueSignalTrades(decoded.id);

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

    // Get the user's bound email to send the OTP there
    const emailRes = await query(`SELECT email_bound, email FROM users WHERE id = $1`, [req.userId]);
    const userEmail = emailRes.rows[0]?.email_bound || emailRes.rows[0]?.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'Please bind an email address first before verifying your phone number.' });
    }

    // Send the OTP to the user's bound email via Resend
    let emailSent = false;
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RXDT Exchange <noreply@rxdt.site>',
          to: [userEmail],
          subject: 'Your RXDT Phone Verification Code',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0e1a;border-radius:16px;border:1px solid #1e2a3a;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#00d4ff;font-size:28px;margin:0;">RXDT Exchange</h1>
                <p style="color:#8899aa;font-size:14px;margin-top:4px;">AI Quantitative Crypto Trading</p>
              </div>
              <h2 style="color:#ffffff;font-size:18px;margin-bottom:8px;">Phone Verification Code</h2>
              <p style="color:#8899aa;font-size:14px;margin-bottom:24px;">Use the code below to verify your phone number <strong style="color:#ffffff;">${phone}</strong>. It expires in <strong style="color:#ffffff;">10 minutes</strong>.</p>
              <div style="background:#111827;border:2px solid #00d4ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#00d4ff;">${otp}</span>
              </div>
              <p style="color:#8899aa;font-size:12px;">If you did not request this code, please ignore this email. Never share your verification code with anyone.</p>
              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e2a3a;text-align:center;">
                <p style="color:#556677;font-size:11px;">© 2026 RXDT Exchange · rxdtex.com</p>
              </div>
            </div>
          `,
        }),
      });

      if (resendRes.ok) {
        emailSent = true;
      } else {
        const err = await resendRes.json().catch(() => ({}));
        console.warn('Resend phone OTP send warning:', err);
      }
    } catch (e) {
      console.warn('Resend phone OTP fetch failed:', e.message);
    }

    if (!emailSent) {
      return res.status(502).json({ error: 'Failed to send verification code. Please try again later.' });
    }

    res.json({ success: true, message: `Verification code sent to your email (${userEmail})` });
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
    doublingDays: 34,
    totalDeposits: parseFloat(u.total_deposits || 0),
    initialDeposit: parseFloat(u.initial_deposit || 0),
    freeSignalCredits: parseInt(u.free_signal_credits || 0),
    doubledCapital: !!u.doubled_capital
  };
}

export default router;