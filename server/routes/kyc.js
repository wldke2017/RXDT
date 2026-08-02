import express from 'express';
import { query } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rxdt_exchange_super_secret_jwt_key_2026';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Submit KYC
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { realName, idNumber, documentType, frontImg, backImg } = req.body;

    if (!realName || !idNumber) {
      return res.status(400).json({ error: 'Real name and ID document number are required.' });
    }

    const id = 'KYC' + Date.now();
    await query('BEGIN');

    await query(`
      INSERT INTO kyc_records (id, user_id, real_name, id_number, document_type, front_img, back_img, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pass');
    `, [id, req.user.id, realName, idNumber, documentType || 'Passport', frontImg || '', backImg || '']);

    // Update user kyc_status to pass
    await query(`UPDATE users SET kyc_status = 'pass' WHERE id = $1;`, [req.user.id]);

    await query('COMMIT');

    res.json({
      message: 'KYC identity verification submitted and approved!',
      kycStatus: 'pass'
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('KYC submit error:', err);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

// Get KYC Status
router.get('/status', authenticate, async (req, res) => {
  try {
    const kycRes = await query(`SELECT * FROM kyc_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`, [req.user.id]);
    const userRes = await query(`SELECT kyc_status FROM users WHERE id = $1;`, [req.user.id]);

    res.json({
      kycStatus: userRes.rows[0]?.kyc_status || 'unverified',
      record: kycRes.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

export default router;
