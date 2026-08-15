import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

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
router.post('/spin', requireAuth, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT name, available_balance, total_assets, spin_chances, last_deposit_amount, spin_winnings_used FROM users WHERE id = $1;`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    const currentSpins = parseInt(user.spin_chances || 0);
    if (currentSpins <= 0) {
      return res.status(400).json({ error: 'No remaining spin chances! Make a deposit to earn more spins.' });
    }

    // Win cap logic: total winnings from spins must be between 1% and 10% of last deposit
    const lastDeposit = parseFloat(user.last_deposit_amount || 0);
    const winningsUsed = parseFloat(user.spin_winnings_used || 0);
    const maxWinCap = lastDeposit * 0.10; // 10% of deposit
    const minWinCap = lastDeposit * 0.01; // 1% of deposit
    const remainingCap = Math.max(0, maxWinCap - winningsUsed);

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

    let prizeValue = parseFloat(won.value);

    // If no deposit has been made, fall back to fixed prize values (no cap)
    if (lastDeposit > 0) {
      // If the win cap has been reached, user gets "Thanks for Playing"
      if (remainingCap <= 0) {
        won = PRIZES[PRIZES.length - 1]; // 'Thanks for Playing'
        prizeValue = 0;
      } else {
        // Cap the prize at the remaining cap (10% of deposit minus winnings already used)
        if (prizeValue > remainingCap) {
          prizeValue = Math.max(0, remainingCap);
        }
        // Ensure minimum win of 1% of deposit if the user actually wins something
        if (prizeValue > 0 && prizeValue < minWinCap) {
          prizeValue = Math.min(minWinCap, remainingCap);
        }
        // Update the won prize name to reflect the actual value
        if (prizeValue > 0 && prizeValue !== parseFloat(won.value)) {
          won = { ...won, name: `${prizeValue.toFixed(2)} USDT`, value: prizeValue };
        }
      }
    }

    const newAvailable = parseFloat(user.available_balance) + prizeValue;
    const newTotal = parseFloat(user.total_assets) + prizeValue;
    const newWinningsUsed = winningsUsed + prizeValue;
    const remainingSpins = currentSpins - 1;

    await withTransaction(async (tx) => {
      await tx(
        `UPDATE users SET available_balance = $1, total_assets = $2, spin_chances = $3, spin_winnings_used = $4 WHERE id = $5;`,
        [newAvailable, newTotal, remainingSpins, newWinningsUsed, req.user.id]
      );

      if (prizeValue > 0) {
        await tx(`
          INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
          VALUES ($1, $2, 'Lucky Wheel Prize', $3, $4, $5);
        `, ['AC' + Date.now(), req.user.id, prizeValue, newAvailable, `Won ${won.name} on Lucky Wheel`]);
      }

      const logId = 'L' + Date.now();
      await tx(`
        INSERT INTO lucky_wheel_logs (id, user_id, user_name, prize_name, prize_value)
        VALUES ($1, $2, $3, $4, $5);
      `, [logId, req.user.id, user.name, won.name, prizeValue]);
    });

    res.json({
      prize: won,
      newAvailableBalance: newAvailable,
      remainingSpins: remainingSpins
    });

  } catch (err) {
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
