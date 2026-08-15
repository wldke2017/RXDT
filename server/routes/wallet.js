import express from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { processDueSignalTrades } from './signals.js';
import { notifyAdminOfPendingItem } from '../notify.js';

const router = express.Router();

// Get Deposits
router.get('/deposits', requireAuth, async (req, res) => {
  try {
    // Settle any due signal trades so frozen ("In Orders") funds are released
    await processDueSignalTrades(req.userId);
    const resDb = await query(`SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC;`, [req.userId]);
    res.json({
      deposits: resDb.rows.map(d => ({
        id: d.id,
        orderNumber: d.order_number,
        amount: parseFloat(d.amount),
        coin: d.coin,
        network: d.network,
        address: d.address,
        txHash: d.tx_hash,
        status: d.status,
        auditStatus: d.audit_status,
        time: d.created_at ? new Date(d.created_at).toISOString().replace('T', ' ').slice(0, 19) : ''
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

// Create Deposit Request
router.post('/deposits', requireAuth, async (req, res) => {
  try {
    const { amount, coin, network, txHash } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const id = 'D' + Date.now();
    const orderNumber = 'DEP' + Date.now();

    const insertRes = await query(`
      INSERT INTO deposits (id, order_number, user_id, amount, coin, network, tx_hash, status, audit_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending')
      RETURNING *;
    `, [id, orderNumber, req.userId, numAmount, coin || 'USDT', network || 'TRC-20', txHash || '']);

    const d = insertRes.rows[0];

    // Notify admin via email of the new pending deposit
    await notifyAdminOfPendingItem({
      type: 'deposit',
      id: d.order_number,
      amount: `$${parseFloat(d.amount).toFixed(2)} USDT`,
      userLabel: req.userId,
      detail: `${d.coin || 'USDT'} (${d.network || 'TRC-20'}) · TX: ${(d.tx_hash || '').slice(0, 12)}...`,
    }).catch(() => { });

    res.json({
      message: 'Deposit request submitted successfully!',
      deposit: {
        id: d.id,
        orderNumber: d.order_number,
        amount: parseFloat(d.amount),
        coin: d.coin,
        network: d.network,
        txHash: d.tx_hash,
        status: d.status,
        auditStatus: d.audit_status,
        time: new Date(d.created_at).toISOString().replace('T', ' ').slice(0, 19)
      }
    });
  } catch (err) {
    console.error('Create deposit error:', err);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

// Get Withdrawals
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    // Settle any due signal trades so frozen ("In Orders") funds are released
    await processDueSignalTrades(req.userId);
    const resDb = await query(`SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC;`, [req.userId]);
    res.json({
      withdrawals: resDb.rows.map(w => ({
        id: w.id,
        orderNumber: w.order_number,
        amount: parseFloat(w.amount),
        coin: w.coin,
        network: w.network,
        address: w.address,
        fee: parseFloat(w.fee),
        status: w.status,
        auditStatus: w.audit_status,
        time: w.created_at ? new Date(w.created_at).toISOString().replace('T', ' ').slice(0, 19) : ''
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Create Withdrawal Request
router.post('/withdrawals', requireAuth, async (req, res) => {
  try {
    const { amount, coin, network, address, transactionPassword } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount < 10) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is $10 USDT.' });
    }

    if (!address) {
      return res.status(400).json({ error: 'Withdrawal address is required.' });
    }

    // Transaction password is required for withdrawals
    if (!transactionPassword) {
      return res.status(400).json({ error: 'Transaction password is required for withdrawals.' });
    }

    // Verify user has a bound withdrawal address and that the request uses it
    const boundRes = await query(`SELECT * FROM bind_addresses WHERE user_id = $1 AND method = 'crypto';`, [req.userId]);
    if (boundRes.rows.length === 0) {
      return res.status(400).json({ error: 'You must bind a withdrawal address first before making a withdrawal.' });
    }
    const primaryBound = boundRes.rows[0];
    if (primaryBound.address !== address) {
      return res.status(400).json({ error: 'Withdrawal can only be made to your permanently bound wallet address.' });
    }


    // Use a REAL transaction (withTransaction checks out ONE client so the
    // BEGIN/COMMIT/ROLLBACK all run on the same connection). The previous
    // manual query('BEGIN')/COMMIT/ROLLBACK pattern was broken because
    // pool.query() picks a random connection per statement, so the row lock
    // and atomicity were silently ignored — allowing double withdrawals and
    // partial updates.
    const result = await withTransaction(async (tx) => {
      // Row-level lock on user record to prevent race-condition double withdrawals
      const userRes = await tx(`SELECT available_balance, total_assets, transaction_password, doubled_capital FROM users WHERE id = $1 FOR UPDATE;`, [req.userId]);
      if (userRes.rows.length === 0) {
        return { error: 'User not found', status: 404 };
      }

      const user = userRes.rows[0];
      const available = parseFloat(user.available_balance);
      const totalAssets = parseFloat(user.total_assets);

      // Verify transaction password
      if (!user.transaction_password) {
        return { error: 'Please set a transaction password first in Security Settings.', status: 400 };
      }
      const pwdMatch = await bcrypt.compare(transactionPassword, user.transaction_password);
      if (!pwdMatch) {
        return { error: 'Incorrect transaction password.', status: 400 };
      }

      // Withdrawal transaction fee:
      // - Users who have NOT yet doubled their invested capital: 25% fee
      // - Users who HAVE doubled their invested capital: 10% fee
      const hasDoubled = !!user.doubled_capital;
      const feeRate = hasDoubled ? 0.10 : 0.25;
      const fee = parseFloat((numAmount * feeRate).toFixed(2));

      if (available < numAmount + fee) {
        return { error: `Insufficient available balance. Minimum required including ${(feeRate * 100).toFixed(0)}% fee: $${(numAmount + fee).toFixed(2)}`, status: 400 };
      }

      const id = 'W' + Date.now();
      const orderNumber = 'WIT' + Date.now();
      const newAvailable = available - numAmount - fee;
      const newTotal = totalAssets - numAmount - fee;

      await tx(`UPDATE users SET available_balance = $1, total_assets = $2 WHERE id = $3;`, [newAvailable, newTotal, req.userId]);

      const insertRes = await tx(`
        INSERT INTO withdrawals (id, order_number, user_id, amount, coin, network, address, fee, status, audit_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing', 'pending')
        RETURNING *;
      `, [id, orderNumber, req.userId, numAmount, coin || 'USDT', network || 'TRC-20', address, fee]);

      await tx(`
        INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
        VALUES ($1, $2, 'Crypto Withdrawal', $3, $4, $5);
      `, ['AC' + Date.now(), req.userId, -(numAmount + fee), newAvailable, `Withdrawal to ${address.slice(0, 8)}... (incl. ${(feeRate * 100).toFixed(0)}% fee $${fee.toFixed(2)})`]);

      return { withdrawal: insertRes.rows[0], newAvailable };
    });

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    const w = result.withdrawal;
    const newAvailable = result.newAvailable;

    // Notify admin via email of the new pending withdrawal
    await notifyAdminOfPendingItem({
      type: 'withdrawal',
      id: w.order_number,
      amount: `$${parseFloat(w.amount).toFixed(2)} USDT`,
      userLabel: req.userId,
      detail: `${w.coin || 'USDT'} (${w.network || 'TRC-20'}) · Fee: $${parseFloat(w.fee || 0).toFixed(2)} · To: ${(w.address || '').slice(0, 12)}...`,
    }).catch(() => { });

    res.json({
      message: 'Withdrawal request submitted successfully!',
      withdrawal: {
        id: w.id,
        orderNumber: w.order_number,
        amount: parseFloat(w.amount),
        coin: w.coin,
        network: w.network,
        address: w.address,
        fee: parseFloat(w.fee),
        status: w.status,
        auditStatus: w.audit_status,
        time: w.created_at ? new Date(w.created_at).toISOString().replace('T', ' ').slice(0, 19) : ''
      },
      newAvailableBalance: newAvailable
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get Account Changes
router.get('/account-changes', requireAuth, async (req, res) => {
  try {
    // Settle any due signal trades so frozen ("In Orders") funds are released
    await processDueSignalTrades(req.userId);
    const resDb = await query(`SELECT * FROM account_changes WHERE user_id = $1 ORDER BY created_at DESC;`, [req.userId]);
    res.json({
      changes: resDb.rows.map(c => ({
        id: c.id,
        type: c.type,
        amount: parseFloat(c.amount),
        balanceAfter: parseFloat(c.balance_after),
        remark: c.remark,
        time: c.created_at ? new Date(c.created_at).toISOString().replace('T', ' ').slice(0, 19) : ''
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account changes' });
  }
});

// Get & Bind Addresses
router.get('/bind-addresses', requireAuth, async (req, res) => {
  try {
    const resDb = await query(`SELECT * FROM bind_addresses WHERE user_id = $1 ORDER BY created_at DESC;`, [req.userId]);
    res.json({ addresses: resDb.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bind addresses' });
  }
});

router.post('/bind-addresses', requireAuth, async (req, res) => {
  try {
    const { coin, network, address, label } = req.body;
    if (!address) return res.status(400).json({ error: 'Wallet address is required.' });

    const targetCoin = coin || 'USDT';
    const targetNetwork = network || 'TRC-20';

    // 1. Check if user already bound ANY wallet address (only 1 bound address allowed permanently)
    const existingAny = await query(`
      SELECT * FROM bind_addresses 
      WHERE user_id = $1 AND method = 'crypto';
    `, [req.userId]);

    if (existingAny.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a bound withdrawal address. Address binding is permanently locked.' });
    }


    const id = 'BA' + Date.now();
    const resDb = await query(`
      INSERT INTO bind_addresses (id, user_id, method, coin, network, address, label)
      VALUES ($1, $2, 'crypto', $3, $4, $5, $6)
      RETURNING *;
    `, [id, req.userId, targetCoin, targetNetwork, address, label || 'Primary Wallet']);

    res.json({ message: 'Wallet address bound successfully!', address: resDb.rows[0] });
  } catch (err) {
    console.error('Bind address error:', err);
    res.status(500).json({ error: 'Failed to bind address' });
  }
});

export default router;