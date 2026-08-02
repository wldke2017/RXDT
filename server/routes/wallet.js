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

// Get Deposits
router.get('/deposits', authenticate, async (req, res) => {
  try {
    const resDb = await query(`SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC;`, [req.user.id]);
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
router.post('/deposits', authenticate, async (req, res) => {
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
    `, [id, orderNumber, req.user.id, numAmount, coin || 'USDT', network || 'TRC-20', txHash || '']);

    const d = insertRes.rows[0];
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
router.get('/withdrawals', authenticate, async (req, res) => {
  try {
    const resDb = await query(`SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC;`, [req.user.id]);
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
router.post('/withdrawals', authenticate, async (req, res) => {
  try {
    const { amount, coin, network, address } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount < 10) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is $10 USDT.' });
    }

    if (!address) {
      return res.status(400).json({ error: 'Withdrawal address is required.' });
    }

    const userRes = await query(`SELECT available_balance, total_assets FROM users WHERE id = $1;`, [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const available = parseFloat(userRes.rows[0].available_balance);
    const totalAssets = parseFloat(userRes.rows[0].total_assets);

    if (available < numAmount) {
      return res.status(400).json({ error: 'Insufficient available balance.' });
    }

    const id = 'W' + Date.now();
    const orderNumber = 'WIT' + Date.now();
    const fee = 1.00; // $1 USDT network withdrawal fee
    const newAvailable = available - numAmount;
    const newTotal = totalAssets - numAmount;

    await query('BEGIN');

    await query(`UPDATE users SET available_balance = $1, total_assets = $2 WHERE id = $3;`, [newAvailable, newTotal, req.user.id]);

    const insertRes = await query(`
      INSERT INTO withdrawals (id, order_number, user_id, amount, coin, network, address, fee, status, audit_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing', 'pending')
      RETURNING *;
    `, [id, orderNumber, req.user.id, numAmount, coin || 'USDT', network || 'TRC-20', address, fee]);

    await query(`
      INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
      VALUES ($1, $2, 'Crypto Withdrawal', $3, $4, $5);
    `, ['AC' + Date.now(), req.user.id, -numAmount, newAvailable, `Withdrawal to ${address.slice(0, 8)}...`]);

    await query('COMMIT');

    const w = insertRes.rows[0];
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
        time: new Date(w.created_at).toISOString().replace('T', ' ').slice(0, 19)
      },
      newAvailableBalance: newAvailable
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get Account Changes
router.get('/account-changes', authenticate, async (req, res) => {
  try {
    const resDb = await query(`SELECT * FROM account_changes WHERE user_id = $1 ORDER BY created_at DESC;`, [req.user.id]);
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
router.get('/bind-addresses', authenticate, async (req, res) => {
  try {
    const resDb = await query(`SELECT * FROM bind_addresses WHERE user_id = $1 ORDER BY created_at DESC;`, [req.user.id]);
    res.json({ addresses: resDb.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bind addresses' });
  }
});

router.post('/bind-addresses', authenticate, async (req, res) => {
  try {
    const { coin, network, address, label } = req.body;
    if (!address) return res.status(400).json({ error: 'Wallet address is required.' });

    const targetCoin = coin || 'USDT';
    const targetNetwork = network || 'TRC-20';

    // 1. Check if user already bound an address on this network (e.g. TRC-20)
    const existingNetwork = await query(`
      SELECT * FROM bind_addresses 
      WHERE user_id = $1 AND coin = $2 AND network = $3;
    `, [req.user.id, targetCoin, targetNetwork]);

    if (existingNetwork.rows.length > 0) {
      return res.status(400).json({ error: `Wallet address already bound for ${targetCoin} (${targetNetwork}). You can only bind one address per network.` });
    }

    // 2. Check if this exact address was bound already
    const existingAddress = await query(`
      SELECT * FROM bind_addresses 
      WHERE user_id = $1 AND address = $2;
    `, [req.user.id, address]);

    if (existingAddress.rows.length > 0) {
      return res.status(400).json({ error: 'Wallet address already bound to your account.' });
    }

    const id = 'BA' + Date.now();
    const resDb = await query(`
      INSERT INTO bind_addresses (id, user_id, method, coin, network, address, label)
      VALUES ($1, $2, 'crypto', $3, $4, $5, $6)
      RETURNING *;
    `, [id, req.user.id, targetCoin, targetNetwork, address, label || 'Primary Wallet']);

    res.json({ message: 'Wallet address bound successfully!', address: resDb.rows[0] });
  } catch (err) {
    console.error('Bind address error:', err);
    res.status(500).json({ error: 'Failed to bind address' });
  }
});

export default router;
