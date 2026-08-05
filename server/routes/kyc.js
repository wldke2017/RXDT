import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyAdminOfPendingItem } from '../notify.js';

const router = express.Router();

// Submit KYC
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { realName, idNumber, documentType, nationality, frontImg, backImg, handheldImg } = req.body;

    if (!realName || !idNumber) {
      return res.status(400).json({ error: 'Real name and ID document number are required.' });
    }

    // Look up the user's name from the database (JWT only has id/phone/email)
    const userRes = await query(`SELECT name FROM users WHERE id = $1`, [req.userId]);
    const userName = userRes.rows[0]?.name || req.userId;

    const id = 'KYC' + Date.now();
    await query('BEGIN');

    await query(`
      INSERT INTO kyc_records (id, user_id, real_name, id_number, nationality, document_type, front_img, back_img, handheld_img, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending');
    `, [id, req.userId, realName, idNumber, nationality || '', documentType || 'Passport', frontImg || '', backImg || '', handheldImg || '']);

    // Update user kyc_status to pending review
    await query(`UPDATE users SET kyc_status = 'pending' WHERE id = $1;`, [req.userId]);

    await query('COMMIT');

    // Notify admin via email of the new pending KYC submission
    await notifyAdminOfPendingItem({
      type: 'kyc',
      id,
      userLabel: userName,
      detail: `${realName} · ${documentType || 'Passport'} · ${nationality || ''}`,
    }).catch(() => { });

    res.json({
      message: 'KYC identity verification submitted successfully! Under review.',
      kycStatus: 'pending'
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    console.error('KYC submit error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit KYC' });
  }
});

// Get KYC Status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const kycRes = await query(`SELECT * FROM kyc_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`, [req.userId]);
    const userRes = await query(`SELECT kyc_status FROM users WHERE id = $1;`, [req.userId]);

    res.json({
      kycStatus: userRes.rows[0]?.kyc_status || 'unverified',
      record: kycRes.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

export default router;
