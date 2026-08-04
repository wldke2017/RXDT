import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ---- Signal Tier Configuration ----
// Kenya EAT (UTC+3) signal windows in UTC:
// Signal 1: 14:00-14:30 UTC (5pm-5:30pm EAT)
// Signal 2: 15:00-15:30 UTC (6pm-6:30pm EAT)
// Signal 3: 16:00-16:30 UTC (7pm-7:30pm EAT)
// Signal 4 (FREE referral signal): 17:00-17:05 UTC (8pm-8:05pm EAT) — 5 minutes only

const SIGNAL_WINDOWS = [
  { id: 1, utcHour: 14, utcMinStart: 0, utcMinEnd: 30 },
  { id: 2, utcHour: 15, utcMinStart: 0, utcMinEnd: 30 },
  { id: 3, utcHour: 16, utcMinStart: 0, utcMinEnd: 30 },
  { id: 4, utcHour: 17, utcMinStart: 0, utcMinEnd: 5, isFreeSignal: true },
];

/**
 * Deposit-based tier rules (based on TOTAL DEPOSITS, not available balance):
 *
 * TIER 1: Total deposits $100–$299 → 1 signal/day (Signal 1) · 1.4% daily profit
 * TIER 2: Total deposits $300–$999 → 2 signals/day (Signals 1 & 2) · 2.4% daily profit
 * TIER 3: Total deposits $1000+    → 3 signals/day (Signals 1, 2 & 3) · 3.1% daily profit
 *
 * Daily profit is split evenly across the user's entitled signals:
 *   Tier 1: 1 signal → 1.4% per signal
 *   Tier 2: 2 signals → 1.2% per signal (2.4% / 2)
 *   Tier 3: 3 signals → ~1.0333% per signal (3.1% / 3)
 *
 * Signal 4 (8pm free referral signal) is available to any user with
 * free_signal_credits > 0 (earned by referring a new user). It is fully
 * automatic and lasts 5 minutes.
 */

const SIGNAL_TIERS = {
  TIER_1: {
    label: 'Tier 1',
    minDeposit: 100,
    maxDeposit: 299.99,
    dailyProfitPercent: 0.014, // 1.4% per day
    signals: [1],
    description: 'Deposit $100–$299 · 1 signal/day · 1.4% daily profit',
  },
  TIER_2: {
    label: 'Tier 2',
    minDeposit: 300,
    maxDeposit: 999.99,
    dailyProfitPercent: 0.024, // 2.4% per day
    signals: [1, 2],
    description: 'Deposit $300–$999 · 2 signals/day · 2.4% daily profit',
  },
  TIER_3: {
    label: 'Tier 3',
    minDeposit: 1000,
    maxDeposit: Infinity,
    dailyProfitPercent: 0.031, // 3.1% per day
    signals: [1, 2, 3],
    description: 'Deposit $1000+ · 3 signals/day · 3.1% daily profit',
  },
};

// Per-signal profit % of balance = dailyProfitPercent / number of signals
function getTier(totalDeposits) {
  if (totalDeposits >= 1000) return SIGNAL_TIERS.TIER_3;
  if (totalDeposits >= 300) return SIGNAL_TIERS.TIER_2;
  if (totalDeposits >= 100) return SIGNAL_TIERS.TIER_1;
  return null; // No tier — user must deposit at least $100
}

// Per-signal profit rate for a tier (daily rate split across entitled signals)
function getPerSignalProfitRate(tier) {
  return tier.dailyProfitPercent / tier.signals.length;
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
  `).catch(() => { });
  await query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ('test_signal', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [val]
  );
}

export async function clearTestSignalWindow() {
  await query(`DELETE FROM system_settings WHERE key = 'test_signal'`).catch(() => { });
}

export async function getTestSignalStatus() {
  try {
    const res = await query(`SELECT value FROM system_settings WHERE key = 'test_signal'`);
    if (!res.rows.length) return null;
    const data = JSON.parse(res.rows[0].value);
    const expiresAt = new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      clearTestSignalWindow().catch(() => { });
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

export async function getActiveSignal() {
  const testSignal = await getTestSignalStatus();
  if (testSignal) return testSignal;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();

  for (const w of SIGNAL_WINDOWS) {
    if (utcHour === w.utcHour && utcMin >= w.utcMinStart && utcMin < w.utcMinEnd) {
      const openTime = new Date(now);
      openTime.setUTCHours(w.utcHour, w.utcMinStart, 0, 0);
      const closeTime = new Date(now);
      closeTime.setUTCHours(w.utcHour, w.utcMinEnd, 0, 0);
      const durationMins = w.utcMinEnd - w.utcMinStart;
      return {
        signalId: w.id,
        tradingPair: 'BTC/USDT',
        pairSymbol: 'BTCUSDT',
        purchaseDuration: '30 seconds',
        openTime: openTime.toISOString(),
        closeTime: closeTime.toISOString(),
        minutesRemaining: durationMins - (utcMin - w.utcMinStart),
        isFreeSignal: !!w.isFreeSignal,
      };
    }
  }
  return null;
}

// ---- GET /api/signals/active ----
router.get('/active', requireAuth, async (req, res) => {
  try {
    const signal = await getActiveSignal();
    const userRes = await query(
      `SELECT available_balance, total_deposits, free_signal_credits FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = userRes.rows[0];
    const balance = parseFloat(user?.available_balance || 0);
    const totalDeposits = parseFloat(user?.total_deposits || 0);
    const freeSignalCredits = parseInt(user?.free_signal_credits || 0);

    // Tier is based on TOTAL DEPOSITS (not available balance)
    const tier = getTier(totalDeposits);

    // For the free 8pm referral signal (Signal 4), eligibility is based on
    // having free_signal_credits > 0, not on the deposit tier.
    let qualified = false;
    if (signal) {
      if (signal.isFreeSignal) {
        qualified = freeSignalCredits > 0;
      } else {
        qualified = !!tier && tier.signals.includes(signal.signalId);
      }
    }

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
      totalDeposits,
      freeSignalCredits,
      tier: tier ? {
        label: tier.label,
        description: tier.description,
        dailyProfitPercent: tier.dailyProfitPercent,
        signals: tier.signals,
      } : null,
      qualified,
      alreadyExecuted,
    });
  } catch (err) {
    console.error('Signals active error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Helper: Auto-settle completed signal trades when release_at has passed ----
export async function processDueSignalTrades(userId) {
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

      // 2b. Check if the user has now doubled their invested capital.
      //     If total_earnings >= initial_deposit, mark doubled_capital = true
      //     (this unlocks the lower 10% withdrawal fee).
      const capRes = await query(
        `SELECT initial_deposit, total_earnings FROM users WHERE id = $1`,
        [userId]
      );
      const cap = capRes.rows[0];
      if (cap) {
        const initialDeposit = parseFloat(cap.initial_deposit || 0);
        const totalEarnings = parseFloat(cap.total_earnings || 0);
        if (initialDeposit > 0 && totalEarnings >= initialDeposit) {
          await query(`UPDATE users SET doubled_capital = TRUE WHERE id = $1`, [userId]);
        }
      }

      // 3. Log Close Position in account_changes
      const closeId = 'AC' + Date.now() + 'C';
      await query(
        `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
         VALUES ($1, $2, 'signal_close', $3, $4, $5)`,
        [closeId, userId, 'signal_close', returnTotal, newBal,
          `Signal ${trade.signal_id} — Close Position (${trade.pair}) +${profit.toFixed(4)} USDT`]
      ).catch(() => { });

      // 4. Referral Commissions — halving chain model.
      //    Level 1 (direct referrer): 7.5% of profit
      //    Level 2: 3.75% (half of L1)
      //    Level 3: 1.875% (half of L2)
      //    ... continues halving up the chain until the commission rounds to 0.
      try {
        if (profit > 0) {
          let currentUserId = userId;
          let commissionRate = 0.075; // Level 1 starts at 7.5%
          let level = 1;

          // Walk up the referral chain, halving the rate each level.
          // Stop when the rate becomes negligible (rounds to 0) or no more referrers.
          while (commissionRate > 0.0001) {
            const refRes = await query(`SELECT referred_by FROM users WHERE id = $1`, [currentUserId]);
            const referrerId = refRes.rows[0]?.referred_by;
            if (!referrerId) break; // top of chain reached

            const commission = parseFloat((profit * commissionRate).toFixed(4));
            if (commission <= 0) break;

            const rcId = 'RC' + Date.now() + 'L' + level;
            await query(
              `INSERT INTO referral_commissions (id, referrer_id, referred_user_id, level, trade_amount, amount)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [rcId, referrerId, userId, level, tradeAmount, commission]
            );

            const balRes = await query(
              `UPDATE users 
               SET available_balance = available_balance + $1,
                   total_assets = total_assets + $1,
                   total_earnings = total_earnings + $1
               WHERE id = $2 RETURNING available_balance`,
              [commission, referrerId]
            );
            const newBal = parseFloat(balRes.rows[0]?.available_balance || 0);
            await query(
              `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
               VALUES ($1, $2, 'commission', $3, $4, $5)`,
              ['AC' + Date.now() + 'R' + level, referrerId, commission, newBal,
              `L${level} Referral Commission — ${trade.pair} trade by referred user +${commission.toFixed(4)} USDT`]
            ).catch(() => { });

            // Move up the chain and halve the rate
            currentUserId = referrerId;
            commissionRate = commissionRate / 2;
            level++;
          }
        }
      } catch (commErr) {
        console.error('Referral commission error (non-fatal):', commErr);
      }

      await query('COMMIT');
    }
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    console.error('Error settling due signal trades:', err);
  }
}

// ---- POST /api/signals/execute ----
router.post('/execute', requireAuth, async (req, res) => {
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
    const totalDeposits = parseFloat(user.total_deposits || 0);
    const freeSignalCredits = parseInt(user.free_signal_credits || 0);

    // Pre-check: block copy trade if the account balance is zero
    if (balance <= 0) {
      return res.status(400).json({ error: 'Insufficient balance to join copy trade' });
    }

    // Determine tier & eligibility
    let tier = null;
    let isFreeSignalTrade = false;
    if (signal.isFreeSignal) {
      // Free 8pm referral signal — requires a free signal credit
      if (freeSignalCredits <= 0) {
        return res.status(400).json({ error: 'No free signal credits available. Refer a friend to earn a free 8pm signal.' });
      }
      isFreeSignalTrade = true;
    } else {
      tier = getTier(totalDeposits);
      if (!tier) {
        return res.status(400).json({ error: 'Minimum deposit of $100 required to participate in copy trading signals.' });
      }
      if (!tier.signals.includes(signal.signalId)) {
        return res.status(400).json({ error: `Your tier (${tier.label}) does not include Signal ${signal.signalId}.` });
      }
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
    const tradeAmount = balance; // 100% of available balance used as trade position
    const variation = Math.random() * 0.10 - 0.05; // ±5% realistic market variation

    // Profit rate: free signal uses Tier 1's per-signal rate (1.4%),
    // otherwise the tier's per-signal rate (daily rate split across signals).
    const profitRate = isFreeSignalTrade
      ? getPerSignalProfitRate(SIGNAL_TIERS.TIER_1)
      : getPerSignalProfitRate(tier);
    const profitAmount = parseFloat((balance * profitRate * (1 + variation)).toFixed(4));
    const newBalance = parseFloat((balance + profitAmount).toFixed(4));
    const tierLabel = isFreeSignalTrade ? 'Free Signal' : tier.label;

    // Release at closeTime (e.g. 17:30, 18:30, 19:30 EAT / end of signal window).
    // This is the GLOBAL scheduled end of the 30-minute window — NOT the user's
    // entry time. A user who joins 5 minutes before the window closes gets the
    // exact same release_at as every other participant, so all assets unlock
    // and release concurrently when the global 30-minute window expires.
    if (!signal.closeTime) {
      return res.status(400).json({ error: 'Signal close time is unavailable. Please try again.' });
    }
    const releaseAt = new Date(signal.closeTime).toISOString();

    const now = Date.now();
    const tradeId = 'ST' + now;
    const openId = 'AC' + now + 'O';

    await query('BEGIN');

    // 1. Move available_balance into frozen_balance ("In Order")
    await query(
      `UPDATE users 
       SET available_balance = available_balance - $1,
           frozen_balance = frozen_balance + $1
       WHERE id = $2`,
      [tradeAmount, req.userId]
    );

    // 1b. If this is a free 8pm referral signal, consume one free signal credit
    if (isFreeSignalTrade) {
      await query(
        `UPDATE users SET free_signal_credits = GREATEST(0, free_signal_credits - 1) WHERE id = $1`,
        [req.userId]
      );
    }

    // 2. Insert signal trade record (status = 'open')
    await query(
      `INSERT INTO signal_trades (id, user_id, signal_id, pair, trade_amount, profit, balance_before, balance_after, tier_label, status, release_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10)`,
      [tradeId, req.userId, signal.signalId, signal.pairSymbol, tradeAmount, profitAmount, balance, newBalance, tierLabel, releaseAt]
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
        tier: tierLabel,
        status: 'open',
        releaseAt,
      },
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    console.error('Signal execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/signals/history ----
router.get('/history', requireAuth, async (req, res) => {
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
router.get('/consume-record', requireAuth, async (req, res) => {
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
