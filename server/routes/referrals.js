import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

export const VIP_TIERS = [
  { level: 'VIP0', name: 'Standard Member', directNeeded: 0, total3LevelNeeded: 0, salary10Days: 0, promotionReward: 0 },
  { level: 'VIP1', name: 'VIP 1 Team Leader', directNeeded: 5, total3LevelNeeded: 0, salary10Days: 30, promotionReward: 100 },
  { level: 'VIP2', name: 'VIP 2 Senior Leader', directNeeded: 5, total3LevelNeeded: 30, salary10Days: 70, promotionReward: 200 },
  { level: 'VIP3', name: 'VIP 3 Executive Leader', directNeeded: 5, total3LevelNeeded: 100, salary10Days: 150, promotionReward: 300 },
  { level: 'VIP4', name: 'VIP 4 Regional Manager', directNeeded: 5, total3LevelNeeded: 200, salary10Days: 200, promotionReward: 500 },
  { level: 'VIP5', name: 'VIP 5 National Director', directNeeded: 5, total3LevelNeeded: 500, salary10Days: 400, promotionReward: 700 },
  { level: 'VIP6', name: 'VIP 6 Global Ambassador', directNeeded: 5, total3LevelNeeded: 1000, salary10Days: 800, promotionReward: 1100 },
  { level: 'VIP7', name: 'VIP 7 Vice President', directNeeded: 5, total3LevelNeeded: 2000, salary10Days: 1000, promotionReward: 2000 },
  { level: 'VIP8', name: 'VIP 8 Executive Partner', directNeeded: 5, total3LevelNeeded: 3000, salary10Days: 1500, promotionReward: 5000 },
  { level: 'VIP9', name: 'VIP 9 Crown Partner', directNeeded: 5, total3LevelNeeded: 5000, salary10Days: 3000, promotionReward: 11000 }
];

export function getVipLevelInfo(directCount, total3LevelCount) {
  let currentTier = VIP_TIERS[0];
  if (directCount < 5) return currentTier;

  for (let i = VIP_TIERS.length - 1; i >= 1; i--) {
    const tier = VIP_TIERS[i];
    if (directCount >= tier.directNeeded && total3LevelCount >= tier.total3LevelNeeded) {
      currentTier = tier;
      break;
    }
  }
  return currentTier;
}

// Helper to calculate next salary distribution date (3rd, 13th, or 23rd of the month)
export function getNextSalaryDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const dates = [3, 13, 23];
  for (const d of dates) {
    if (day < d) {
      return new Date(Date.UTC(year, month, d, 0, 0, 0));
    }
  }
  // If past 23rd, next is 3rd of next month
  return new Date(Date.UTC(year, month + 1, 3, 0, 0, 0));
}

/**
 * QUALIFICATION RULE FOR VIP TEAM COUNTING
 * -----------------------------------------
 * A referred member counts toward a referrer's VIP team ONLY if they have:
 *   1. Made a successful deposit  → deposits.status = 'success' AND audit_status = 'approved'
 *   2. Received at least 1 signal  → exists a row in signal_trades for that user
 *   3. Traded successfully         → exists a COMPLETED signal_trade with profit > 0
 *
 * Merely referring a user and having them register/join does NOT qualify that
 * member for the referrer's VIP team size, salary or promotion rewards.
 */
async function getQualifiedMemberIds(userIds) {
  if (!userIds || userIds.length === 0) return new Set();

  const res = await query(
    `SELECT DISTINCT u.id
     FROM users u
     WHERE u.id = ANY($1::text[])
       AND EXISTS (
         SELECT 1 FROM deposits d
         WHERE d.user_id = u.id AND d.status = 'success' AND d.audit_status = 'approved'
       )
       AND EXISTS (
         SELECT 1 FROM signal_trades st
         WHERE st.user_id = u.id
       )
       AND EXISTS (
         SELECT 1 FROM signal_trades st2
         WHERE st2.user_id = u.id AND st2.status = 'completed' AND st2.profit > 0
       )`,
    [userIds]
  );
  return new Set(res.rows.map(r => r.id));
}

// Filter a member list down to only the members that qualify for VIP counting.
function filterQualifiedMembers(members, qualifiedSet) {
  return members.filter(m => qualifiedSet.has(m.id));
}

// Helper to calculate 3-level team counts for a user.
// IMPORTANT: only referred members who have deposited, received at least one
// signal AND traded successfully count toward the VIP team. Members who merely
// registered/joined are excluded.
export async function calculate3LevelTeam(userId, inviteCode) {
  // Level 1 (Direct)
  const directRes = await query(
    `SELECT id, name, phone, email, created_at, available_balance, total_assets 
     FROM users 
     WHERE referred_by = $1 OR referred_by = $2 
     ORDER BY created_at DESC`,
    [userId, inviteCode]
  );
  const directMembers = directRes.rows;

  // Level 2
  let level2Members = [];
  if (directMembers.length > 0) {
    const directIds = directMembers.map(m => m.id);
    const l2Res = await query(
      `SELECT id, name, phone, email, created_at, available_balance, total_assets 
       FROM users 
       WHERE referred_by = ANY($1::text[])`,
      [directIds]
    );
    level2Members = l2Res.rows;
  }

  // Level 3
  let level3Members = [];
  if (level2Members.length > 0) {
    const l2Ids = level2Members.map(m => m.id);
    const l3Res = await query(
      `SELECT id, name, phone, email, created_at, available_balance, total_assets 
       FROM users 
       WHERE referred_by = ANY($1::text[])`,
      [l2Ids]
    );
    level3Members = l3Res.rows;
  }

  // Determine which of the 3-level members are "qualified" for VIP counting.
  const allMemberIds = [
    ...directMembers.map(m => m.id),
    ...level2Members.map(m => m.id),
    ...level3Members.map(m => m.id)
  ];
  const qualifiedSet = await getQualifiedMemberIds(allMemberIds);

  // Filter each level down to qualified members only.
  const qualifiedDirect = filterQualifiedMembers(directMembers, qualifiedSet);
  const qualifiedLevel2 = filterQualifiedMembers(level2Members, qualifiedSet);
  const qualifiedLevel3 = filterQualifiedMembers(level3Members, qualifiedSet);

  const total3LevelCount = qualifiedDirect.length + qualifiedLevel2.length + qualifiedLevel3.length;

  return {
    directCount: qualifiedDirect.length,
    level2Count: qualifiedLevel2.length,
    level3Count: qualifiedLevel3.length,
    total3LevelCount,
    directMembers: qualifiedDirect,
    level2Members: qualifiedLevel2,
    level3Members: qualifiedLevel3
  };
}

// GET /api/referrals/stats — fetch live referral count, direct members, total commission, VIP status & salary
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userRes = await query(`SELECT id, invite_code, vip_level, last_salary_payout_date FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const inviteCode = user.invite_code;
    const teamStats = await calculate3LevelTeam(req.userId, inviteCode);
    const vipInfo = getVipLevelInfo(teamStats.directCount, teamStats.total3LevelCount);

    // Update user's calculated vip_level in DB if changed
    if (user.vip_level !== vipInfo.level) {
      await query(`UPDATE users SET vip_level = $1 WHERE id = $2`, [vipInfo.level, req.userId]);
    }

    // Query total referral commissions
    const commRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_commission 
       FROM referral_commissions 
       WHERE referrer_id = $1`,
      [req.userId]
    );
    const totalCommission = parseFloat(commRes.rows[0]?.total_commission || 0);

    // Fetch salary payouts history
    const salaryRes = await query(
      `SELECT * FROM salary_payouts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [req.userId]
    );

    // Fetch promotion claims history
    const claimsRes = await query(
      `SELECT * FROM vip_promotion_claims WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );

    // Format direct member list
    const membersList = teamStats.directMembers.map(m => ({
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
      directMembers: teamStats.directCount,
      level2Members: teamStats.level2Count,
      level3Members: teamStats.level3Count,
      total3LevelMembers: teamStats.total3LevelCount,
      totalMembers: teamStats.total3LevelCount,
      totalCommission,
      vipInfo,
      nextSalaryDate: getNextSalaryDate(),
      salaryPayouts: salaryRes.rows,
      promotionClaims: claimsRes.rows,
      vipTiers: VIP_TIERS,
      members: membersList
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// POST /api/referrals/claim-promotion — submit a claim for VIP promotion reward
router.post('/claim-promotion', requireAuth, async (req, res) => {
  try {
    const userRes = await query(`SELECT id, invite_code FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const teamStats = await calculate3LevelTeam(req.userId, user.invite_code);
    const vipInfo = getVipLevelInfo(teamStats.directCount, teamStats.total3LevelCount);

    if (vipInfo.level === 'VIP0') {
      return res.status(400).json({ error: 'VIP1 or higher required to claim promotion rewards' });
    }

    // Check if claim already submitted for this level
    const existing = await query(
      `SELECT * FROM vip_promotion_claims WHERE user_id = $1 AND vip_level = $2`,
      [req.userId, vipInfo.level]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: `Claim for ${vipInfo.level} already submitted. Status: ${existing.rows[0].status}`,
        claim: existing.rows[0]
      });
    }

    const claimId = `VCLAIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newClaim = await query(
      `INSERT INTO vip_promotion_claims (id, user_id, vip_level, reward_amount, status, note)
       VALUES ($1, $2, $3, $4, 'pending', 'Submitted by user for community leader review')
       RETURNING *`,
      [claimId, req.userId, vipInfo.level, vipInfo.promotionReward]
    );

    res.json({
      success: true,
      message: `Promotion reward claim for ${vipInfo.level} ($${vipInfo.promotionReward}) submitted successfully!`,
      claim: newClaim.rows[0]
    });
  } catch (err) {
    console.error('Claim promotion error:', err);
    res.status(500).json({ error: 'Failed to submit promotion claim' });
  }
});

export default router;
