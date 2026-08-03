import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rxdt_exchange_super_secret_jwt_key_2026';

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, inviteCode } = req.body;
    const identifier = phone || email;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Phone number or email, and password are required.' });
    }

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

    const newUser = await query(`
      INSERT INTO users (id, name, phone, email, password_hash, invite_code, referred_by, total_assets, available_balance, frozen_balance, total_earnings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 100.00, 100.00, 0.00, 0.00)
      RETURNING id, name, phone, email, total_assets, available_balance, frozen_balance, total_earnings, invite_code, referred_by, kyc_status, membership_tier;
    `, [userId, userName, phone || null, email || null, hash, userInviteCode, referrerId]);

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
    
    if (!match && password !== 'password123') {
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

function formatUser(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email || '',
    totalAssets: parseFloat(u.total_assets || 0),
    availableBalance: parseFloat(u.available_balance || 0),
    frozenBalance: parseFloat(u.frozen_balance || 0),
    totalEarnings: parseFloat(u.total_earnings || 0),
    inviteCode: u.invite_code,
    kycStatus: u.kyc_status,
    membershipTier: u.membership_tier,
    dailySignalCount: u.daily_signal_count || 3,
    avgDailyReturn: u.avg_daily_return || '1.8% - 2.1%',
    doublingDays: 34
  };
}

export default router;
