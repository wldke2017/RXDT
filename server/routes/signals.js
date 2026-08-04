import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rxdt_exchange_super_secret_jwt_key_2026';

// ---- Signal Tier Configuration ----
// Kenya EAT (UTC+3) signal windows in UTC:
// Signal 1: 14:00-14:30 UTC (5pm-5:30pm EAT)
// Signal 2: 15:00-15:30 UTC (6pm-6:30pm EAT)
// Signal 3: 16:00-16:30 UTC (7pm-7:30pm EAT)

const SIGNAL_WINDOWS = [
  { id: 1, utcHour: 14, utcMinStart: 0, utcMinEnd: 30 },
  { id: 2, utcHour: 15, utcMinStart: 0, utcMinEnd: 30 },
  { id: 3, utcHour: 16, utcMinStart: 0, utcMinEnd: 30 },
];

/**
 * Tier rules and doubling math:
 *
 * TESTING MODE: Capital < $500 → doubles in 34 days (3 signals/day, 102 trades)
 *   Per-trade profit % of balance = 2^(1/102) - 1 ≈ 0.6817%
 *   Trade amount = 10% of balance → return on trade = 6.817%
 *   Daily gain: 3 × 0.6817% compounding ≈ 2.06%/day → ×34 days = 2.0× ✓
 *
 * STANDARD MODE: Capital ≥ $500 → doubles in 28 days (3 signals/day, 84 trades)
 *   Per-trade profit % of balance = 2^(1/84) - 1 ≈ 0.8286%
 *   Trade amount = 10% of balance → return on trade = 8.286%
 *   Daily gain: 3 × 0.8286% compounding ≈ 2.50%/day → ×28 days = 2.0× ✓
 * 
 * Note: Referral commissions and deposit bonuses increase total balance, which scales up
 * the 10% trade stake and compounds earnings faster for active users!
 */

const SIGNAL_TIERS = {
  TESTING_MODE: {
    label: 'Testing Mode',
    minBalance: 0,
    maxBalance: 499.99,
    doubleDays: 34,
    tradePercent: 0.10,
    profitOnTradePercent: 0.06817,
    profitOnBalancePercent: 0.006817,
    signals: [1, 2, 3],
    description: 'Capital < $500 · Testing Mode · Doubles in 34 days (3 signals/day)',
  },
  STANDARD_MODE: {
    label: 'Standard Trader',
    minBalance: 500,
    maxBalance: Infinity,
    doubleDays: 28,
    tradePercent: 0.10,
    profitOnTradePercent: 0.08286,
    profitOnBalancePercent: 0.008286,
    signals: [1, 2, 3],
    description: 'Capital ≥ $500 · Standard Tier · Doubles in 28 days (3 signals/day)',
  },
};

function getTier(balance, isTestMode = false) {
  if (balance >= 500) return SIGNAL_TIERS.STANDARD_MODE;
  if (balance >= 0 || isTestMode) return SIGNAL_TIERS.TESTING_MODE;
  return SIGNAL_TIERS.TESTING_MODE;
}

export async function setTestSignalWindow(durationMinutes = 15, signalId = 1) {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const val = JSON.stringify({ signalId, expiresAt });
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
  await query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ('test_signal', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [val]
  );
}

export async function clearTestSignalWindow() {
  await query(`DELETE FROM system_settings WHERE key = 'test_signal'`).catch(() => {});
}

export async function getTestSignalStatus() {
  try {
    const res = await query(`SELECT value FROM system_settings WHERE key = 'test_signal'`);
    if (!res.rows.length) return null;
    const data = JSON.parse(res.rows[0].value);
    const expiresAt = new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      clearTestSignalWindow().catch(() => {});
      return null;
    }
    const minsLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 60000);
    return {
      signalId: data.signalId || 1,
      tradingPair: 'BTC/USDT',
      pairSymbol: 'BTCUSDT',
      purchaseDuration: '30 seconds',
      openTime: new Date().toISOString(),
      closeTime: expiresAt.toISOString(),
      minutesRemaining: minsLeft,
      isTestMode: true,
    };
  } catch {
    return null;
  }
}

async function getActiveSignal() {
  const testSignal = await getTestSignalStatus();
  if (testSignal) return testSignal;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin  = now.getUTCMinutes();

  for (const w of SIGNAL_WINDOWS) {
    if (utcHour === w.utcHour && utcMin >= w.utcMinStart && utcMin < w.utcMinEnd) {
      const openTime = new Date(now);
      openTime.setUTCHours(w.utcHour, w.utcMinStart, 0, 0);
      const closeTime = new Date(openTime);
      closeTime.setUTCMinutes(closeTime.getUTCMinutes() + 30);
      return {
        signalId: w.id,
        tradingPair: 'BTC/USDT',
        pairSymbol: 'BTCUSDT',
        purchaseDuration: '30 seconds',
        openTime: openTime.toISOString(),
        closeTime: closeTime.toISOString(),
        minutesRemaining: 30 - (utcMin - w.utcMinStart),
      };
    }
  }
  return null;
}

// ---- Auth Middleware ----
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---- GET /api/signals/active ----
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const signal = await getActiveSignal();
    const userRes = await query(
      `SELECT available_balance FROM users WHERE id = $1`,
      [req.userId]
    );
    const balance = parseFloat(userRes.rows[0]?.available_balance || 0);
    const tier = getTier(balance, !!signal?.isTestMode);

    let alreadyExecuted = false;
    if (signal) {
      const today = new Date().toISOString().split('T')[0];
      const execCheck = await query(
        `SELECT id FROM signal_trades WHERE user_id = $1 AND signal_id = $2 AND DATE(created_at) = $3`,
        [req.userId, signal.signalId, today]
      ).catch(() => ({ rows: [] }));
      alreadyExecuted = execCheck.rows.length > 0;
    }

    res.json({
      activeSignal: signal,
      userBalance: balance,
      tier: tier ? {
        label: tier.label,
        description: tier.description,
        doubleDays: tier.doubleDays,
      } : null,
      qualified: !!tier && !!signal,
      alreadyExecuted,
    });
  } catch (err) {
    console.error('Signals active error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Helper: Auto-settle completed signal trades when release_at has passed ----
async function processDueSignalTrades(userId) {
  try {
    const dueTrades = await query(
      `SELECT * FROM signal_trades WHERE user_id = $1 AND status = 'open' AND release_at <= NOW()`,
      [userId]
    );

    for (const trade of dueTrades.rows) {
      await query('BEGIN');
      const tradeAmount = parseFloat(trade.trade_amount);
      const profit = parseFloat(trade.profit);
      const returnTotal = tradeAmount + profit;

      // 1. Release frozen balance and add profit to available_balance & total_assets & total_earnings
      const userRes = await query(
        `UPDATE users 
         SET frozen_balance = GREATEST(0, frozen_balance - $1),
             available_balance = available_balance + $2,
             total_assets = total_assets + $3,
             total_earnings = total_earnings + $3
         WHERE id = $4 RETURNING available_balance`,
        [tradeAmount, returnTotal, profit, userId]
      );

      const newBal = parseFloat(userRes.rows[0]?.available_balance || 0);

      // 2. Mark trade completed
      await query(`UPDATE signal_trades SET status = 'completed' WHERE id = $1`, [trade.id]);

      // 3. Log Close Position in account_changes
      const closeId = 'AC' + Date.now() + 'C';
      await query(
        `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
         VALUES ($1, $2, 'signal_close', $3, $4, $5)`,
        [closeId, userId, 'signal_close', returnTotal, newBal,
         `Signal ${trade.signal_id} — Close Position (${trade.pair}) +${profit.toFixed(4)} USDT`]
      ).catch(() => {});

      // 4. Referral Commissions — auto-credit Level 1 (15%) and Level 2 (7.5%)
      try {
        const refRes = await query(`SELECT referred_by FROM users WHERE id = $1`, [userId]);
        const referrerId = refRes.rows[0]?.referred_by;

        if (referrerId && profit > 0) {
          // --- Level 1: 15% of profit to direct referrer ---
          const l1Commission = parseFloat((profit * 0.15).toFixed(4));
          if (l1Commission > 0) {
            const l1Id = 'RC' + Date.now() + 'L1';
            await query(
              `INSERT INTO referral_commissions (id, referrer_id, referred_user_id, level, trade_amount, amount)
               VALUES ($1, $2, $3, 1, $4, $5)`,
              [l1Id, referrerId, userId, tradeAmount, l1Commission]
            );
            const l1BalRes = await query(
              `UPDATE users 
               SET available_balance = available_balance + $1,
                   total_assets = total_assets + $1,
                   total_earnings = total_earnings + $1
               WHERE id = $2 RETURNING available_balance`,
              [l1Commission, referrerId]
            );
            const l1Bal = parseFloat(l1BalRes.rows[0]?.available_balance || 0);
            await query(
              `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
               VALUES ($1, $2, 'commission', $3, $4, $5)`,
              ['AC' + Date.now() + 'R1', referrerId, l1Commission, l1Bal,
               `L1 Referral Commission — ${trade.pair} trade by referred user +${l1Commission.toFixed(4)} USDT`]
            ).catch(() => {});

            // --- Level 2: 7.5% of profit to referrer's referrer ---
            const ref2Res = await query(`SELECT referred_by FROM users WHERE id = $1`, [referrerId]);
            const level2Id = ref2Res.rows[0]?.referred_by;
            if (level2Id) {
              const l2Commission = parseFloat((profit * 0.075).toFixed(4));
              if (l2Commission > 0) {
                const l2RcId = 'RC' + Date.now() + 'L2';
                await query(
                  `INSERT INTO referral_commissions (id, referrer_id, referred_user_id, level, trade_amount, amount)
                   VALUES ($1, $2, $3, 2, $4, $5)`,
                  [l2RcId, level2Id, userId, tradeAmount, l2Commission]
                );
                const l2BalRes = await query(
                  `UPDATE users 
                   SET available_balance = available_balance + $1,
                       total_assets = total_assets + $1,
                       total_earnings = total_earnings + $1
                   WHERE id = $2 RETURNING available_balance`,
                  [l2Commission, level2Id]
                );
                const l2Bal = parseFloat(l2BalRes.rows[0]?.available_balance || 0);
                await query(
                  `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
                   VALUES ($1, $2, 'commission', $3, $4, $5)`,
                  ['AC' + Date.now() + 'R2', level2Id, l2Commission, l2Bal,
                   `L2 Referral Commission — ${trade.pair} trade by L2 referral +${l2Commission.toFixed(4)} USDT`]
                ).catch(() => {});
              }
            }
          }
        }
      } catch (commErr) {
        console.error('Referral commission error (non-fatal):', commErr);
      }

      await query('COMMIT');
    }
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error settling due signal trades:', err);
  }
}

// ---- POST /api/signals/execute ----
router.post('/execute', authMiddleware, async (req, res) => {
  try {
    await processDueSignalTrades(req.userId);

    const signal = await getActiveSignal();
    if (!signal) {
      return res.status(400).json({ error: 'No active signal right now. Log in at 5pm, 6pm, or 7pm EAT.' });
    }

    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balance = parseFloat(user.available_balance);
    const tier = getTier(balance, !!signal.isTestMode);

    if (!tier) {
      return res.status(400).json({ error: 'Minimum balance of $100 required to participate in copy trading signals.' });
    }

    // Prevent duplicate execution today
    const today = new Date().toISOString().split('T')[0];
    const execCheck = await query(
      `SELECT id FROM signal_trades WHERE user_id = $1 AND signal_id = $2 AND DATE(created_at) = $3`,
      [req.userId, signal.signalId, today]
    ).catch(() => ({ rows: [] }));
    if (execCheck.rows.length > 0) {
      return res.status(400).json({ error: `You have already joined Signal ${signal.signalId} today.` });
    }

    // 100% Capital Allocation Trade
    const tradeAmount   = balance; // 100% of available balance used as trade position
    const variation     = Math.random() * 0.10 - 0.05; // ±5% realistic market variation
    const profitAmount  = parseFloat((balance * tier.profitOnBalancePercent * (1 + variation)).toFixed(4));
    const newBalance    = parseFloat((balance + profitAmount).toFixed(4));

    // Release at closeTime (e.g. 17:30, 18:30, 19:30 EAT / end of signal window)
    const releaseAt = signal.closeTime ? new Date(signal.closeTime).toISOString() : new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const now    = Date.now();
    const tradeId = 'ST' + now;
    const openId  = 'AC' + now + 'O';

    await query('BEGIN');

    // 1. Move available_balance into frozen_balance ("In Order")
    await query(
      `UPDATE users 
       SET available_balance = available_balance - $1,
           frozen_balance = frozen_balance + $1
       WHERE id = $2`,
      [tradeAmount, req.userId]
    );

    // 2. Insert signal trade record (status = 'open')
    await query(
      `INSERT INTO signal_trades (id, user_id, signal_id, pair, trade_amount, profit, balance_before, balance_after, tier_label, status, release_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10)`,
      [tradeId, req.userId, signal.signalId, signal.pairSymbol, tradeAmount, profitAmount, balance, newBalance, tier.label, releaseAt]
    );

    // 3. Log Open Position (Full 100% Allocation into Order)
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
       VALUES ($1, $2, 'signal_open', $3, 0, $4)`,
      [openId, req.userId, -tradeAmount, `Signal ${signal.signalId} — Open Position (${signal.pairSymbol}) placed in Order`]
    );

    await query('COMMIT');

    res.json({
      success: true,
      message: `Order submitted successfully! Capital is placed In Order and will be released at ${new Date(releaseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with profit.`,
      trade: {
        id: tradeId,
        signalId: signal.signalId,
        pair: signal.tradingPair,
        tradeAmount,
        profit: profitAmount,
        balanceBefore: balance,
        balanceAfter: newBalance,
        tier: tier.label,
        status: 'open',
        releaseAt,
      },
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Signal execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/signals/history ----
router.get('/history', authMiddleware, async (req, res) => {
  try {
    await processDueSignalTrades(req.userId);
    const result = await query(
      `SELECT * FROM signal_trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    ).catch(() => ({ rows: [] }));
    res.json({ trades: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message, trades: [] });
  }
});

// ---- GET /api/signals/consume-record ----
router.get('/consume-record', authMiddleware, async (req, res) => {
  try {
    await processDueSignalTrades(req.userId);
    const result = await query(
      `SELECT * FROM account_changes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.userId]
    ).catch(() => ({ rows: [] }));
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message, records: [] });
  }
});

export default router;
