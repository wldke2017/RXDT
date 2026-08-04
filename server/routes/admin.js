import express from 'express';
import { query } from '../db.js';

const router = express.Router();

function requireAdminSecret(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'] || req.query.admin_secret;
  const expectedSecret = process.env.ADMIN_SECRET;
  if (!expectedSecret) {
    console.error('❌ ADMIN_SECRET environment variable is required for admin routes.');
    return res.status(503).json({ error: 'Admin routes not configured.' });
  }
  if (!adminSecret || adminSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Access denied: Invalid Admin Secret' });
  }
  next();
}

// ----------------------------------------------------
// STATS OVERVIEW
// ----------------------------------------------------
router.get('/stats', requireAdminSecret, async (req, res) => {
  try {
    const [users, deposits, withdrawals, kyc, signals] = await Promise.all([
      query(`SELECT COUNT(*) as count, SUM(available_balance) as total_balance FROM users`),
      query(`SELECT COUNT(*) as count FROM deposits WHERE audit_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM withdrawals WHERE audit_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM kyc_records WHERE status = 'pending'`),
      query(`SELECT COUNT(*) as count, SUM(profit) as total_profit FROM signal_trades`).catch(() => ({ rows: [{ count: 0, total_profit: 0 }] })),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalBalance: parseFloat(users.rows[0].total_balance || 0),
      pendingDeposits: parseInt(deposits.rows[0].count),
      pendingWithdrawals: parseInt(withdrawals.rows[0].count),
      pendingKyc: parseInt(kyc.rows[0].count),
      totalSignalTrades: parseInt(signals.rows[0].count),
      totalSignalProfit: parseFloat(signals.rows[0].total_profit || 0),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ----------------------------------------------------
// PENDING (deposits, withdrawals, KYC)
// ----------------------------------------------------
router.get('/pending', requireAdminSecret, async (req, res) => {
  try {
    const deposits = await query(`
      SELECT d.*, u.phone as user_phone, u.name as user_name 
      FROM deposits d LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.audit_status = 'pending' ORDER BY d.created_at DESC`);
    const withdrawals = await query(`
      SELECT w.*, u.phone as user_phone, u.name as user_name 
      FROM withdrawals w LEFT JOIN users u ON w.user_id = u.id 
      WHERE w.audit_status = 'pending' ORDER BY w.created_at DESC`);
    const kycRecords = await query(`
      SELECT k.*, u.phone as user_phone, u.name as user_name 
      FROM kyc_records k LEFT JOIN users u ON k.user_id = u.id 
      WHERE k.status = 'pending' ORDER BY k.created_at DESC`);
    res.json({
      pendingDeposits: deposits.rows,
      pendingWithdrawals: withdrawals.rows,
      pendingKyc: kycRecords.rows
    });
  } catch (err) {
    console.error('Admin pending fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// ----------------------------------------------------
// USERS LIST + BALANCE ADJUST
// ----------------------------------------------------
router.get('/users', requireAdminSecret, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, phone, email, available_balance, total_assets, total_earnings,
             kyc_status, invite_code, created_at
      FROM users ORDER BY created_at DESC LIMIT 200`);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users/balance', requireAdminSecret, async (req, res) => {
  try {
    const { userId, amount, remark } = req.body;
    if (!userId || amount === undefined) return res.status(400).json({ error: 'userId and amount required' });
    const amt = parseFloat(amount);
    const userRes = await query(
      `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1
       WHERE id = $2 RETURNING id, name, available_balance, total_assets`,
      [amt, userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = userRes.rows[0];
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['AC' + Date.now(), userId, 'admin_adjustment', amt, u.available_balance, remark || 'Admin balance adjustment']
    );
    res.json({ message: `Balance updated for ${u.name}. New balance: $${parseFloat(u.available_balance).toFixed(2)}`, user: u });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

import { setTestSignalWindow, clearTestSignalWindow, getTestSignalStatus } from './signals.js';

// ----------------------------------------------------
// SIGNAL TEST TRIGGER (ADMIN DEMO MODE)
// ----------------------------------------------------
router.get('/signal-status', requireAdminSecret, async (req, res) => {
  const status = await getTestSignalStatus();
  res.json({ isTestActive: !!status, testSignal: status });
});

router.post('/trigger-signal', requireAdminSecret, async (req, res) => {
  const { action, signalId, duration } = req.body;
  if (action === 'stop') {
    await clearTestSignalWindow();
    return res.json({ message: '🛑 Test signal deactivated.' });
  }

  const mins = parseInt(duration || 15);
  const sigId = parseInt(signalId || 1);
  await setTestSignalWindow(mins, sigId);
  res.json({ message: `🚀 Test Signal ${sigId} triggered for ${mins} minutes! Users will now see the pop-up modal.` });
});

// ----------------------------------------------------
// SIGNAL TRADES LIST
// ----------------------------------------------------
router.get('/signal-trades', requireAdminSecret, async (req, res) => {
  try {
    const result = await query(`
      SELECT st.*, u.name as user_name, u.phone as user_phone
      FROM signal_trades st LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC LIMIT 200
    `).catch(() => ({ rows: [] }));
    res.json({ trades: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch signal trades', trades: [] });
  }
});

// ----------------------------------------------------
// KYC APPROVE / REJECT
// ----------------------------------------------------
router.post('/kyc/approve', requireAdminSecret, async (req, res) => {
  try {
    const { kycId } = req.body;
    if (!kycId) return res.status(400).json({ error: 'kycId is required' });
    await query('BEGIN');
    const kycRes = await query(`UPDATE kyc_records SET status = 'pass' WHERE id = $1 RETURNING *`, [kycId]);
    if (!kycRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'KYC not found' }); }
    await query(`UPDATE users SET kyc_status = 'pass' WHERE id = $1`, [kycRes.rows[0].user_id]);
    await query('COMMIT');
    res.json({ message: `KYC for ${kycRes.rows[0].real_name} approved!` });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
});

router.post('/kyc/reject', requireAdminSecret, async (req, res) => {
  try {
    const { kycId, reason } = req.body;
    if (!kycId) return res.status(400).json({ error: 'kycId is required' });
    await query('BEGIN');
    const kycRes = await query(
      `UPDATE kyc_records SET status = 'rejected', reject_reason = $2 WHERE id = $1 RETURNING *`,
      [kycId, reason || 'Unclear documents']
    );
    if (!kycRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'KYC not found' }); }
    await query(`UPDATE users SET kyc_status = 'rejected' WHERE id = $1`, [kycRes.rows[0].user_id]);
    await query('COMMIT');
    res.json({ message: `KYC for ${kycRes.rows[0].real_name} rejected.` });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
});

// ----------------------------------------------------
// DEPOSITS APPROVE / REJECT
// ----------------------------------------------------
router.post('/deposits/approve', requireAdminSecret, async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) return res.status(400).json({ error: 'depositId is required' });
    await query('BEGIN');
    const depRes = await query(`SELECT * FROM deposits WHERE id = $1 FOR UPDATE`, [depositId]);
    if (!depRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'Deposit not found' }); }
    const dep = depRes.rows[0];
    if (dep.audit_status !== 'pending') { await query('ROLLBACK'); return res.status(400).json({ error: `Already ${dep.audit_status}` }); }
    const amount = parseFloat(dep.amount);
    // Award 1 lucky spin chance per $50 deposited (minimum 1 spin per approved deposit)
    const awardedSpins = Math.max(1, Math.floor(amount / 50));

    await query(`UPDATE deposits SET status = 'success', audit_status = 'approved' WHERE id = $1`, [depositId]);
    const userRes = await query(
      `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1, spin_chances = spin_chances + $2 WHERE id = $3 RETURNING available_balance, spin_chances`,
      [amount, awardedSpins, dep.user_id]
    );
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['AC' + Date.now(), dep.user_id, 'deposit', amount, userRes.rows[0].available_balance, `Deposit approved: ${dep.order_number} (+${awardedSpins} Lucky Spin Chances)`]
    );
    await query('COMMIT');
    res.json({ message: `Deposit ${dep.order_number} ($${amount}) approved! Granted ${awardedSpins} spin chance(s).`, newBalance: parseFloat(userRes.rows[0].available_balance), spinChances: parseInt(userRes.rows[0].spin_chances) });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

router.post('/deposits/reject', requireAdminSecret, async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) return res.status(400).json({ error: 'depositId is required' });
    const depRes = await query(
      `UPDATE deposits SET status = 'failed', audit_status = 'rejected' WHERE id = $1 AND audit_status = 'pending' RETURNING *`,
      [depositId]
    );
    if (!depRes.rows.length) return res.status(400).json({ error: 'Not found or already processed' });
    res.json({ message: `Deposit ${depRes.rows[0].order_number} rejected.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
});

// ----------------------------------------------------
// WITHDRAWALS APPROVE / REJECT
// ----------------------------------------------------
router.post('/withdrawals/approve', requireAdminSecret, async (req, res) => {
  try {
    const { withdrawalId } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });
    const witRes = await query(
      `UPDATE withdrawals SET status = 'completed', audit_status = 'approved' WHERE id = $1 AND audit_status = 'pending' RETURNING *`,
      [withdrawalId]
    );
    if (!witRes.rows.length) return res.status(400).json({ error: 'Not found or already processed' });
    const w = witRes.rows[0];
    res.json({ message: `Withdrawal ${w.order_number} ($${w.amount}) approved!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

router.post('/withdrawals/reject', requireAdminSecret, async (req, res) => {
  try {
    const { withdrawalId, reason } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });
    await query('BEGIN');
    const witRes = await query(`SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE`, [withdrawalId]);
    if (!witRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'Withdrawal not found' }); }
    const w = witRes.rows[0];
    if (w.audit_status !== 'pending') { await query('ROLLBACK'); return res.status(400).json({ error: `Already ${w.audit_status}` }); }
    // Refund the full amount plus the $1 fee that was deducted when the withdrawal was created
    const amount = parseFloat(w.amount);
    const fee = parseFloat(w.fee || 0);
    const refundTotal = amount + fee;
    await query(`UPDATE withdrawals SET status = 'failed', audit_status = 'rejected' WHERE id = $1`, [withdrawalId]);
    const userRes = await query(
      `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1 WHERE id = $2 RETURNING available_balance`,
      [refundTotal, w.user_id]
    );
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['AC' + Date.now(), w.user_id, 'withdrawal_refund', refundTotal, userRes.rows[0].available_balance, `Withdrawal rejected & refunded (incl. fee): ${reason || 'Audit failed'}`]
    );
    await query('COMMIT');
    res.json({ message: `Withdrawal ${w.order_number} rejected & $${refundTotal.toFixed(2)} (incl. fee) refunded!` });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

export default router;
