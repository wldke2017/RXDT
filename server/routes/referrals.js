import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/referrals/stats — fetch live referral count, direct members, total commission, and referral list
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // 1. Get current user's invite_code
    const userRes = await query(`SELECT invite_code FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const inviteCode = user.invite_code;

    // 2. Query direct referrals (users who registered with this user's invite_code)
    const directRes = await query(
      `SELECT id, name, phone, email, created_at, available_balance, total_assets 
       FROM users 
       WHERE referred_by = $1 OR referred_by = $2 
       ORDER BY created_at DESC`,
      [req.userId, inviteCode]
    );

    const directMembers = directRes.rows;
    const directCount = directMembers.length;

    // 3. Query indirect (Level 2) referrals
    let level2Count = 0;
    let level2Members = [];
    if (directCount > 0) {
      const directIds = directMembers.map(m => m.id);
      const level2Res = await query(
        `SELECT id, name, phone, email, created_at 
         FROM users 
         WHERE referred_by = ANY($1::text[])`,
        [directIds]
      );
      level2Members = level2Res.rows;
      level2Count = level2Members.length;
    }

    const totalMembers = directCount + level2Count;

    // 4. Calculate commissions from referral_commissions table (or calculate estimated commission)
    const commRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_commission 
       FROM referral_commissions 
       WHERE referrer_id = $1`,
      [req.userId]
    );
    const totalCommission = parseFloat(commRes.rows[0]?.total_commission || 0);

    // Format member list for response
    const membersList = directMembers.map(m => ({
      id: m.id,
      name: m.name || 'Trader',
      phone: m.phone ? m.phone.slice(0, 3) + '****' + m.phone.slice(-4) : '',
      email: m.email ? m.email.slice(0, 2) + '***@' + m.email.split('@')[1] : '',
      joinedAt: m.created_at,
      totalAssets: parseFloat(m.total_assets || 0),
      level: 1
    }));

    res.json({
      success: true,
      inviteCode,
      directMembers: directCount,
      level2Members: level2Count,
      totalMembers,
      totalCommission,
      members: membersList
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

export default router;
