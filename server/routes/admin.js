import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Simple admin secret check middleware
function requireAdminSecret(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'] || req.query.admin_secret;
  const expectedSecret = process.env.ADMIN_SECRET || 'rxdt_admin_secret_key_2026';

  if (!adminSecret || adminSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Access denied: Invalid Admin Secret' });
  }
  next();
}

// ----------------------------------------------------
// 1. LIST ALL PENDING DEPOSITS & WITHDRAWALS
// ----------------------------------------------------
router.get('/pending', requireAdminSecret, async (req, res) => {
  try {
    const deposits = await query(`
      SELECT d.*, u.phone as user_phone, u.name as user_name 
      FROM deposits d 
      LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.audit_status = 'pending' 
      ORDER BY d.created_at DESC;
    `);

    const withdrawals = await query(`
      SELECT w.*, u.phone as user_phone, u.name as user_name 
      FROM withdrawals w 
      LEFT JOIN users u ON w.user_id = u.id 
      WHERE w.audit_status = 'pending' 
      ORDER BY w.created_at DESC;
    `);

    res.json({
      pendingDeposits: deposits.rows,
      pendingWithdrawals: withdrawals.rows
    });
  } catch (err) {
    console.error('Admin pending fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// ----------------------------------------------------
// 2. APPROVE DEPOSIT
// ----------------------------------------------------
router.post('/deposits/approve', requireAdminSecret, async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) return res.status(400).json({ error: 'depositId is required' });

    await query('BEGIN');

    const depRes = await query(`SELECT * FROM deposits WHERE id = $1 FOR UPDATE;`, [depositId]);
    if (depRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Deposit record not found' });
    }

    const dep = depRes.rows[0];
    if (dep.audit_status !== 'pending') {
      await query('ROLLBACK');
      return res.status(400).json({ error: `Deposit is already ${dep.audit_status}` });
    }

    const amount = parseFloat(dep.amount);

    // Update deposit status
    await query(`
      UPDATE deposits 
      SET status = 'success', audit_status = 'approved' 
      WHERE id = $1;
    `, [depositId]);

    // Credit user's available balance and total assets
    const userRes = await query(`
      UPDATE users 
      SET available_balance = available_balance + $1, 
          total_assets = total_assets + $1 
      WHERE id = $2 
      RETURNING available_balance, total_assets;
    `, [amount, dep.user_id]);

    // Log account change
    await query(`
      INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
      VALUES ($1, $2, 'Crypto Deposit Approved', $3, $4, $5);
    `, ['AC' + Date.now(), dep.user_id, amount, userRes.rows[0].available_balance, `Deposit approved: ${dep.order_number}`]);

    await query('COMMIT');

    res.json({
      message: `✅ Deposit ${dep.order_number} ($${amount}) approved and user balance credited!`,
      newBalance: parseFloat(userRes.rows[0].available_balance)
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Approve deposit error:', err);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

// ----------------------------------------------------
// 3. REJECT DEPOSIT
// ----------------------------------------------------
router.post('/deposits/reject', requireAdminSecret, async (req, res) => {
  try {
    const { depositId, reason } = req.body;
    if (!depositId) return res.status(400).json({ error: 'depositId is required' });

    const depRes = await query(`
      UPDATE deposits 
      SET status = 'failed', audit_status = 'rejected' 
      WHERE id = $1 AND audit_status = 'pending' 
      RETURNING *;
    `, [depositId]);

    if (depRes.rows.length === 0) {
      return res.status(400).json({ error: 'Deposit record not found or already processed' });
    }

    res.json({
      message: `❌ Deposit ${depRes.rows[0].order_number} rejected.`,
      reason: reason || 'Audit rejected'
    });
  } catch (err) {
    console.error('Reject deposit error:', err);
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
});

// ----------------------------------------------------
// 4. APPROVE WITHDRAWAL
// ----------------------------------------------------
router.post('/withdrawals/approve', requireAdminSecret, async (req, res) => {
  try {
    const { withdrawalId, txHash } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });

    const witRes = await query(`
      UPDATE withdrawals 
      SET status = 'completed', audit_status = 'approved' 
      WHERE id = $1 AND audit_status = 'pending' 
      RETURNING *;
    `, [withdrawalId]);

    if (witRes.rows.length === 0) {
      return res.status(400).json({ error: 'Withdrawal record not found or already processed' });
    }

    const w = witRes.rows[0];
    res.json({
      message: `✅ Withdrawal ${w.order_number} ($${w.amount}) approved and marked completed!`,
      txHash: txHash || 'Processed'
    });
  } catch (err) {
    console.error('Approve withdrawal error:', err);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

// ----------------------------------------------------
// 5. REJECT WITHDRAWAL (REFUND USER BALANCE)
// ----------------------------------------------------
router.post('/withdrawals/reject', requireAdminSecret, async (req, res) => {
  try {
    const { withdrawalId, reason } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });

    await query('BEGIN');

    const witRes = await query(`SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE;`, [withdrawalId]);
    if (witRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Withdrawal record not found' });
    }

    const w = witRes.rows[0];
    if (w.audit_status !== 'pending') {
      await query('ROLLBACK');
      return res.status(400).json({ error: `Withdrawal is already ${w.audit_status}` });
    }

    const amount = parseFloat(w.amount);

    // Update withdrawal status
    await query(`
      UPDATE withdrawals 
      SET status = 'failed', audit_status = 'rejected' 
      WHERE id = $1;
    `, [withdrawalId]);

    // Refund user balance
    const userRes = await query(`
      UPDATE users 
      SET available_balance = available_balance + $1, 
          total_assets = total_assets + $1 
      WHERE id = $2 
      RETURNING available_balance;
    `, [amount, w.user_id]);

    // Log account change
    await query(`
      INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
      VALUES ($1, $2, 'Withdrawal Refund', $3, $4, $5);
    `, ['AC' + Date.now(), w.user_id, amount, userRes.rows[0].available_balance, `Withdrawal rejected & refunded: ${reason || 'Audit failed'}`]);

    await query('COMMIT');

    res.json({
      message: `❌ Withdrawal ${w.order_number} ($${amount}) rejected and refunded to user account!`,
      refundedAmount: amount
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Reject withdrawal error:', err);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

export default router;
