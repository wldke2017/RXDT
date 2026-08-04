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

const PRIZES = [
  { id: 1, name: '0.88 USDT', value: 0.88, probability: 0.35, icon: '💵' },
  { id: 2, name: '1.88 USDT', value: 1.88, probability: 0.25, icon: '💰' },
  { id: 3, name: '5.00 USDT', value: 5.00, probability: 0.15, icon: '💎' },
  { id: 4, name: '8.88 USDT', value: 8.88, probability: 0.10, icon: '🎁' },
  { id: 5, name: '18.88 USDT', value: 18.88, probability: 0.08, icon: '🔥' },
  { id: 6, name: '50.00 USDT Coupon', value: 0, probability: 0.04, icon: '🎟️' },
  { id: 7, name: '88.88 USDT Grand Prize', value: 88.88, probability: 0.02, icon: '🏆' },
  { id: 8, name: 'Thanks for Playing', value: 0, probability: 0.01, icon: '🌟' }
];

// Perform Spin
router.post('/spin', authenticate, async (req, res) => {
  try {
    const userRes = await query(`SELECT name, available_balance, total_assets, spin_chances FROM users WHERE id = $1;`, [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    const currentSpins = parseInt(user.spin_chances || 0);
    if (currentSpins <= 0) {
      return res.status(400).json({ error: 'No remaining spin chances! Make a deposit to earn more spins.' });
    }

    // Server side weighted prize calculation
    let rand = Math.random();
    let cumulative = 0;
    let won = PRIZES[PRIZES.length - 1];

    for (const prize of PRIZES) {
      cumulative += prize.probability;
      if (rand <= cumulative) {
        won = prize;
        break;
      }
    }

    const prizeValue = parseFloat(won.value);
    const newAvailable = parseFloat(user.available_balance) + prizeValue;
    const newTotal = parseFloat(user.total_assets) + prizeValue;
    const remainingSpins = currentSpins - 1;

    await query('BEGIN');

    await query(`UPDATE users SET available_balance = $1, total_assets = $2, spin_chances = $3 WHERE id = $4;`, [newAvailable, newTotal, remainingSpins, req.user.id]);

    if (prizeValue > 0) {
      await query(`
        INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
        VALUES ($1, $2, 'Lucky Wheel Prize', $3, $4, $5);
      `, ['AC' + Date.now(), req.user.id, prizeValue, newAvailable, `Won ${won.name} on Lucky Wheel`]);
    }

    const logId = 'L' + Date.now();
    await query(`
      INSERT INTO lucky_wheel_logs (id, user_id, user_name, prize_name, prize_value)
      VALUES ($1, $2, $3, $4, $5);
    `, [logId, req.user.id, user.name, won.name, prizeValue]);

    await query('COMMIT');

    res.json({
      prize: won,
      newAvailableBalance: newAvailable,
      remainingSpins: remainingSpins
    });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Spin error:', err);
    res.status(500).json({ error: 'Failed to process spin' });
  }
});

// Get Lucky Wheel Logs
router.get('/logs', async (req, res) => {
  try {
    const logsRes = await query(`SELECT * FROM lucky_wheel_logs ORDER BY created_at DESC LIMIT 30;`);
    res.json({
      logs: logsRes.rows.map(l => ({
        id: l.id,
        user: l.user_name,
        prize: l.prize_name,
        time: l.created_at ? new Date(l.created_at).toISOString().replace('T', ' ').slice(0, 19) : ''
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
