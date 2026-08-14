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

// ---- Market Price Helper (for signal history purchase/settlement prices) ----
// Fetches the live pair price from Binance with a short-lived cache so the
// 8-second poller and batch auto-executions don't hammer the public API.
// If Binance is unreachable, we drift the last known price slightly so
// history records are still complete and realistic.
const priceCache = new Map(); // symbol -> { price, ts }

async function getMarketPrice(symbol) {
  const sym = (symbol || 'BTCUSDT').toUpperCase().replace('/', '');
  const cached = priceCache.get(sym);
  if (cached && Date.now() - cached.ts < 10000) return cached.price;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`);
    if (!res.ok) throw new Error(`price fetch failed (${res.status})`);
    const data = await res.json();
    const price = parseFloat(data.price);
    if (!(price > 0)) throw new Error('invalid price payload');
    priceCache.set(sym, { price, ts: Date.now() });
    return price;
  } catch (e) {
    const base = cached?.price || 65000;
    const drifted = parseFloat((base * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
    priceCache.set(sym, { price: drifted, ts: Date.now() });
    return drifted;
  }
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

/**
 * Auto-execute eligible signals for ALL qualified users.
 * Called when a signal window is active — ensures every eligible user
 * receives their entitled signal even if they are not online.
 * Tracks processed windows in system_settings to avoid duplicates.
 */
export async function autoExecuteEligibleSignals() {
  try {
    const signal = await getActiveSignal();
    if (!signal) return { executed: 0, skipped: 0, message: 'No active signal' };

    // Debounce: run the full auto-execute at most once per 10 seconds per
    // signal window. This prevents excessive DB churn from concurrent
    // serverless invocations / the 8-second poller, while still catching
    // users who deposit mid-window (each window gets ~180 retry slots).
    //
    // NOTE: previously a single GLOBAL "auto_exec_last_run" key was used.
    // That key could block the current day's first run if the previous
    // day's last run happened within 45s, and more critically a serverless
    // timeout mid-run would block ALL retries for 45 seconds on every
    // subsequent invocation — leaving many users untraded for the window.
    // The per-window key + short 10s debounce means a timed-out invocation
    // only delays retries by a few seconds.
    const today = new Date().toISOString().split('T')[0];
    const debounceKey = `auto_exec_${today}_${signal.signalId}`;
    const debRes = await query(
      `SELECT value FROM system_settings WHERE key = $1`, [debounceKey]
    ).catch(() => ({ rows: [] }));
    if (debRes.rows.length > 0) {
      const lastRunMs = parseInt(debRes.rows[0].value || '0');
      if (Date.now() - lastRunMs < 10000) {
        return { executed: 0, skipped: 0, message: 'Auto-execute already ran recently' };
      }
    }
    await query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [debounceKey, String(Date.now())]
    ).catch(() => { });

    // Find all eligible users
    const usersRes = await query(`
      SELECT id, available_balance, total_deposits, free_signal_credits 
      FROM users 
      WHERE available_balance > 0
    `);

    let executed = 0;
    let skipped = 0;

    for (const user of usersRes.rows) {
      const balance = parseFloat(user.available_balance);
      const totalDeposits = parseFloat(user.total_deposits || 0);
      const freeSignalCredits = parseInt(user.free_signal_credits || 0);

      // Check qualification
      let tier = null;
      let isFreeSignalTrade = false;
      if (signal.isFreeSignal) {
        if (freeSignalCredits <= 0) { skipped++; continue; }
        isFreeSignalTrade = true;
      } else {
        tier = getTier(totalDeposits);
        if (!tier || !tier.signals.includes(signal.signalId)) { skipped++; continue; }
      }

      // Check balance
      if (balance <= 0) { skipped++; continue; }

      // Check if already executed today
      const execCheck = await query(
        `SELECT id FROM signal_trades WHERE user_id = $1 AND signal_id = $2 AND DATE(created_at) = $3`,
        [user.id, signal.signalId, today]
      ).catch(() => ({ rows: [] }));
      if (execCheck.rows.length > 0) { skipped++; continue; }

      // Check auto-trade preference (default: enabled)
      const prefRes = await query(
        `SELECT auto_signal_exec FROM users WHERE id = $1`,
        [user.id]
      ).catch(() => ({ rows: [{ auto_signal_exec: true }] }));
      const autoExec = prefRes.rows[0]?.auto_signal_exec !== false;
      if (!autoExec) { skipped++; continue; }

      // Execute the trade
      try {
        await executeSignalTrade(user.id, signal, balance, tier, isFreeSignalTrade, freeSignalCredits);
        executed++;
      } catch (e) {
        console.warn(`Auto-execute failed for user ${user.id}:`, e.message);
        skipped++;
      }
    }

    console.log(`✅ Auto-executed Signal ${signal.signalId}: ${executed} trades, ${skipped} skipped`);
    return { executed, skipped, signalId: signal.signalId, message: `Auto-executed ${executed} trades` };
  } catch (err) {
    console.error('Auto-execute error:', err);
    return { executed: 0, skipped: 0, message: err.message };
  }
}

/**
 * Execute a signal trade for a specific user (shared logic between manual & auto).
 * Moves available_balance → frozen_balance, inserts signal_trade, logs account change.
 *
 * Race-condition safe: the duplicate check is performed INSIDE the transaction
 * while holding a row lock (SELECT ... FOR UPDATE) on the user. This serializes
 * concurrent executions for the same user (e.g. the 8-second auto-execute poller
 * racing with a manual "Join Copy Trading" click), preventing duplicate positions.
 *
 * @param {string} userId
 * @param {object} signal
 * @param {number} balance - available balance at time of call
 * @param {object|null} tier
 * @param {boolean} isFreeSignalTrade
 * @param {number} freeSignalCredits
 * @param {number} [tradeAmount] - optional amount to trade; defaults to full balance
 * @returns {Promise<object|false>} trade record on success, false if duplicate/skipped
 */
async function executeSignalTrade(userId, signal, balance, tier, isFreeSignalTrade, freeSignalCredits, tradeAmount) {
  const today = new Date().toISOString().split('T')[0];

  // Default to 100% capital allocation if no amount specified
  const amount = tradeAmount && tradeAmount > 0 && tradeAmount <= balance ? tradeAmount : balance;

  if (!signal.closeTime) return false;
  const releaseAt = new Date(signal.closeTime).toISOString();

  const now = Date.now();
  const tradeId = 'ST' + now + '_' + userId.substring(0, 4);
  const openId = 'AC' + now + 'O_' + userId.substring(0, 4);

  // Capture the live market price BEFORE opening the transaction (network
  // call) so the Copy Trade History shows a real Purchase price, and derive
  // the delivery duration in seconds (e.g. 30s) for the history record.
  const purchasePrice = await getMarketPrice(signal.pairSymbol);
  const deliverySeconds = Math.max(1, Math.round((new Date(releaseAt).getTime() - now) / 1000));

  await query('BEGIN');


  try {
    // Lock the user row to serialize concurrent executions for this user.
    // Any other concurrent request for the same user will block here until
    // this transaction commits/rolls back, preventing the duplicate race.
    const lockRes = await query(
      `SELECT id, available_balance, free_signal_credits FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (!lockRes.rows.length) {
      await query('ROLLBACK');
      return false;
    }

    // Re-read the balance under the lock (it may have changed while waiting)
    const lockedBalance = parseFloat(lockRes.rows[0].available_balance);
    const lockedFreeCredits = parseInt(lockRes.rows[0].free_signal_credits || 0);

    // Re-check for duplicate INSIDE the transaction (after acquiring the lock).
    // This is the critical fix: two concurrent requests can no longer both pass
    // the duplicate check because the second one blocks on FOR UPDATE until the
    // first commits its INSERT.
    const execCheck = await query(
      `SELECT id FROM signal_trades WHERE user_id = $1 AND signal_id = $2 AND DATE(created_at) = $3`,
      [userId, signal.signalId, today]
    );
    if (execCheck.rows.length > 0) {
      await query('ROLLBACK');
      return false;
    }

    // Re-validate balance under lock
    if (lockedBalance <= 0) {
      await query('ROLLBACK');
      return false;
    }

    // Re-validate free signal credits under lock
    if (isFreeSignalTrade && lockedFreeCredits <= 0) {
      await query('ROLLBACK');
      return false;
    }

    // Use the locked balance for the trade amount if no explicit amount was given
    const effectiveAmount = amount > 0 && amount <= lockedBalance ? amount : lockedBalance;

    const variation = Math.random() * 0.10 - 0.05; // ±5% realistic market variation

    const profitRate = isFreeSignalTrade
      ? getPerSignalProfitRate(SIGNAL_TIERS.TIER_1)
      : getPerSignalProfitRate(tier);
    const profitAmount = parseFloat((effectiveAmount * profitRate * (1 + variation)).toFixed(4));
    const newBalance = parseFloat((effectiveAmount + profitAmount).toFixed(4));
    const tierLabel = isFreeSignalTrade ? 'Free Signal' : tier.label;

    // 1. Move available_balance into frozen_balance ("In Order")
    await query(
      `UPDATE users 
       SET available_balance = available_balance - $1,
           frozen_balance = frozen_balance + $1
       WHERE id = $2`,
      [effectiveAmount, userId]
    );

    // 1b. If this is a free 8pm referral signal, consume one free signal credit
    if (isFreeSignalTrade) {
      await query(
        `UPDATE users SET free_signal_credits = GREATEST(0, free_signal_credits - 1) WHERE id = $1`,
        [userId]
      );
    }

    // 2. Insert signal trade record (with purchase price + delivery time so
    //    the Copy Trade History shows full delivery-contract style details)
    await query(
      `INSERT INTO signal_trades (id, user_id, signal_id, pair, trade_amount, profit, balance_before, balance_after, tier_label, status, release_at, purchase_price, delivery_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, $11, $12)`,
      [tradeId, userId, signal.signalId, signal.pairSymbol, effectiveAmount, profitAmount, lockedBalance, newBalance, tierLabel, releaseAt, purchasePrice, deliverySeconds]
    );


    // 3. Log Open Position
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
       VALUES ($1, $2, 'signal_open', $3, 0, $4)`,
      [openId, userId, -effectiveAmount, `Signal ${signal.signalId} — Auto-executed (${signal.pairSymbol}) placed in Order`]
    );

    await query('COMMIT');

    return {
      id: tradeId,
      signalId: signal.signalId,
      pair: signal.pairSymbol,
      tradeAmount: effectiveAmount,
      profit: profitAmount,
      balanceBefore: lockedBalance,
      balanceAfter: newBalance,
      tier: tierLabel,
      status: 'open',
      releaseAt,
    };
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    throw err;
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
    // Auto-execute eligible signals for ALL qualified users.
    // This ensures every user receives their entitled signal even if
    // they are not online to manually click "Join Copy Trading".
    // The auto-execute is triggered by the frontend poller (every 8s)
    // and by any user hitting this endpoint during a signal window.
    if (req.query.auto !== 'false') {
      await autoExecuteEligibleSignals();
    }

    const signal = await getActiveSignal();
    const userRes = await query(
      `SELECT available_balance, total_deposits, free_signal_credits, auto_signal_exec FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = userRes.rows[0];
    const balance = parseFloat(user?.available_balance || 0);
    const totalDeposits = parseFloat(user?.total_deposits || 0);
    const freeSignalCredits = parseInt(user?.free_signal_credits || 0);
    // Whether this user wants signals executed automatically. When false,
    // the user prefers to manually execute trades after the notification.
    const autoSignalExec = user?.auto_signal_exec !== false;

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
      autoSignalExec,
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

// ---- POST /api/signals/preference ----
// Toggle whether the user wants signals executed automatically (true) or
// manually after the popup notification (false). When manual mode is on,
// the backend's autoExecuteEligibleSignals() skips this user, and they
// must click "Confirm Copy Trade" themselves during the signal window.
router.post('/preference', requireAuth, async (req, res) => {
  try {
    const autoSignalExec = req.body?.autoSignalExec === true;
    await query(
      `UPDATE users SET auto_signal_exec = $1 WHERE id = $2`,
      [autoSignalExec, req.userId]
    );
    res.json({ success: true, autoSignalExec });
  } catch (err) {
    console.error('Signal preference error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/signals/poll ----
// Public heartbeat endpoint. The frontend polls this every 8 seconds from
// EVERY page (logged in or not) so the backend auto-executes eligible
// signal trades even when no logged-in user has the app open.
// Also settles ALL past-due open positions for all users globally — this
// ensures positions always close after 30 mins even if the user is offline.
router.get('/poll', async (req, res) => {
  try {
    const [execResult, settleResult] = await Promise.allSettled([
      autoExecuteEligibleSignals(),
      settleAllDueSignalTrades(),
    ]);
    res.json({
      ok: true,
      execute: execResult.status === 'fulfilled' ? execResult.value : { error: execResult.reason?.message },
      settle: settleResult.status === 'fulfilled' ? settleResult.value : { error: settleResult.reason?.message },
    });
  } catch (err) {
    console.error('Signal poll error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---- Helper: Auto-settle completed signal trades when release_at has passed ----
// Race-condition safe: each due trade is atomically claimed with
//   UPDATE signal_trades SET status = 'processing'
//   WHERE id = (SELECT ... status='open' AND release_at <= NOW() ...)
//   RETURNING *
// so concurrent triggers (the 8-second poller's /active, /me, /history and
// /consume-record ALL call this function) can NEVER settle the same trade
// twice. Previously, two or three concurrent requests could all read the
// same 'open' trade before any of them flipped it to 'completed', crediting
// the user 2-3x for a single position.
export async function processDueSignalTrades(userId) {
  try {
    // Atomically claim & settle due trades one at a time.
    while (true) {
      const claimRes = await query(
        `UPDATE signal_trades
         SET status = 'processing'
         WHERE id = (
           SELECT id FROM signal_trades
           WHERE user_id = $1 AND status = 'open' AND release_at <= NOW()
           ORDER BY created_at ASC
           LIMIT 1
         )
         RETURNING id, signal_id, pair, trade_amount, profit, balance_before, balance_after`,
        [userId]
      );
      const claimed = claimRes.rows[0];
      if (!claimed) break; // no more due trades — done

      // Capture the live settlement price for the history record (outside
      // the transaction; the price helper caches for 10s so batch settlements
      // of the same pair share one fetch).
      const settlementPrice = await getMarketPrice(claimed.pair);

      try {
        const trade = claimed;

        const tradeAmount = parseFloat(trade.trade_amount);
        const profit = parseFloat(trade.profit);
        const returnTotal = tradeAmount + profit;

        await query('BEGIN');

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

        // 2. Mark trade completed (was atomically claimed as 'processing')
        //    and stamp the settlement price + time for the history record.
        await query(
          `UPDATE signal_trades SET status = 'completed', settlement_price = $2, settled_at = NOW() WHERE id = $1`,
          [trade.id, settlementPrice]
        );


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

        // 3. Log Close Position in account_changes (includes the unique trade id
        //    in the remark so any future duplicate settlement is easy to detect).
        const closeId = 'AC' + Date.now() + 'C';
        await query(
          `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
           VALUES ($1, $2, 'signal_close', $3, $4, $5)`,
          [closeId, userId, returnTotal, newBal,
            `Signal ${trade.signal_id} — Close Position (${trade.pair}) +${profit.toFixed(4)} USDT · trade ${trade.id}`]
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
      } catch (err) {
        await query('ROLLBACK').catch(() => { });
        // Reset the claim so the trade can be retried on the next poll
        await query(`UPDATE signal_trades SET status = 'open' WHERE id = $1`, [claimed.id]).catch(() => { });
        throw err;
      }
    }
  } catch (err) {
    console.error('Error settling due signal trades:', err);
  }
}

// ---- Helper: Settle ALL due trades globally (called from /poll) ----
// Finds every open trade with release_at <= NOW() across ALL users and settles
// them atomically. This is the fix for positions not closing when users are
// offline after the 30-minute signal window expires.
export async function settleAllDueSignalTrades() {
  let settled = 0;
  let errors = 0;
  try {
    // Atomically claim all due trades one at a time
    while (true) {
      const claimRes = await query(
        `UPDATE signal_trades
         SET status = 'processing'
         WHERE id = (
           SELECT id FROM signal_trades
           WHERE status = 'open' AND release_at <= NOW()
           ORDER BY release_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, user_id, signal_id, pair, trade_amount, profit, balance_before, balance_after`
      );
      const claimed = claimRes.rows[0];
      if (!claimed) break; // no more due trades

      const userId = claimed.user_id;
      const settlementPrice = await getMarketPrice(claimed.pair).catch(() => null);

      try {
        const tradeAmount = parseFloat(claimed.trade_amount);
        const profit = parseFloat(claimed.profit);
        const returnTotal = tradeAmount + profit;

        await query('BEGIN');

        // Release frozen balance + credit profit
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

        // Mark trade completed
        await query(
          `UPDATE signal_trades SET status = 'completed', settlement_price = $2, settled_at = NOW() WHERE id = $1`,
          [claimed.id, settlementPrice]
        );

        // Check doubled-capital milestone
        const capRes = await query(`SELECT initial_deposit, total_earnings FROM users WHERE id = $1`, [userId]);
        const cap = capRes.rows[0];
        if (cap) {
          const initialDeposit = parseFloat(cap.initial_deposit || 0);
          const totalEarnings = parseFloat(cap.total_earnings || 0);
          if (initialDeposit > 0 && totalEarnings >= initialDeposit) {
            await query(`UPDATE users SET doubled_capital = TRUE WHERE id = $1`, [userId]);
          }
        }

        // Log close in account_changes
        const closeId = 'AC' + Date.now() + 'GC';
        await query(
          `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
           VALUES ($1, $2, 'signal_close', $3, $4, $5)`,
          [closeId, userId, returnTotal, newBal,
            `Signal ${claimed.signal_id} — Auto-Close Position (${claimed.pair}) +${profit.toFixed(4)} USDT · trade ${claimed.id}`]
        ).catch(() => {});

        // Referral commissions (halving chain)
        try {
          if (profit > 0) {
            let currentUserId = userId;
            let commissionRate = 0.075;
            let level = 1;
            while (commissionRate > 0.0001) {
              const refRes = await query(`SELECT referred_by FROM users WHERE id = $1`, [currentUserId]);
              const referrerId = refRes.rows[0]?.referred_by;
              if (!referrerId) break;
              const commission = parseFloat((profit * commissionRate).toFixed(4));
              if (commission <= 0) break;
              const rcId = 'RC' + Date.now() + 'GL' + level;
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
              const refBal = parseFloat(balRes.rows[0]?.available_balance || 0);
              await query(
                `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
                 VALUES ($1, $2, 'commission', $3, $4, $5)`,
                ['AC' + Date.now() + 'GR' + level, referrerId, commission, refBal,
                  `L${level} Referral Commission — ${claimed.pair} +${commission.toFixed(4)} USDT`]
              ).catch(() => {});
              currentUserId = referrerId;
              commissionRate = commissionRate / 2;
              level++;
            }
          }
        } catch (commErr) {
          console.error('Global settle referral commission error:', commErr);
        }

        await query('COMMIT');
        settled++;
      } catch (err) {
        await query('ROLLBACK').catch(() => {});
        await query(`UPDATE signal_trades SET status = 'open' WHERE id = $1`, [claimed.id]).catch(() => {});
        console.error(`Global settle error for trade ${claimed.id}:`, err.message);
        errors++;
      }
    }
    if (settled > 0) console.log(`✅ Global settle: ${settled} trades settled, ${errors} errors`);
    return { settled, errors };
  } catch (err) {
    console.error('settleAllDueSignalTrades error:', err);
    return { settled, errors };
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

    // Use the amount from the request body, or default to 100% of available balance
    const requestedAmount = parseFloat(req.body?.amount);
    const tradeAmount = requestedAmount && requestedAmount > 0 && requestedAmount <= balance
      ? requestedAmount
      : balance;

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

    // Execute the trade using the shared race-safe helper.
    // This performs the duplicate check INSIDE the transaction with a row lock,
    // so a concurrent auto-execute (8-second poller) cannot create a duplicate.
    const trade = await executeSignalTrade(
      req.userId,
      signal,
      balance,
      tier,
      isFreeSignalTrade,
      freeSignalCredits,
      tradeAmount
    );

    if (!trade) {
      return res.status(400).json({ error: `You have already joined Signal ${signal.signalId} today.` });
    }

    res.json({
      success: true,
      message: `Order submitted successfully! Capital is placed In Order and will be released at ${new Date(trade.releaseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with profit.`,
      trade,
    });
  } catch (err) {
    console.error('Signal execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/signals/history ----
router.get('/history', requireAuth, async (req, res) => {
  try {
    await processDueSignalTrades(req.userId);
    const statusFilter = req.query.status; // optional: 'open', 'completed', etc.
    let queryStr, queryParams;
    if (statusFilter) {
      queryStr = `SELECT * FROM signal_trades WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 100`;
      queryParams = [req.userId, statusFilter];
    } else {
      queryStr = `SELECT * FROM signal_trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`;
      queryParams = [req.userId];
    }

    const result = await query(queryStr, queryParams).catch(() => ({ rows: [] }));
    res.json({ trades: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message, trades: [] });
  }
});


// ---- GET /api/signals/missed ----
// Returns signal windows (last 7 days) the user was eligible for but did
// not execute a trade on. This powers the "Missed" tab in Copy Trade History
// so users can review signals they missed (e.g. app closed, no balance,
// auto-exec disabled) — and be reminded to stay active for the next window.
router.get('/missed', requireAuth, async (req, res) => {
  try {
    await processDueSignalTrades(req.userId);

    const userRes = await query(
      `SELECT total_deposits, free_signal_credits, created_at FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const totalDeposits = parseFloat(user.total_deposits || 0);
    const freeSignalCredits = parseInt(user.free_signal_credits || 0);
    const accountCreatedAt = new Date(user.created_at);

    const tier = getTier(totalDeposits);

    // Load every signal trade the user has executed so we can determine
    // which windows were actually traded.
    const tradesRes = await query(
      `SELECT signal_id, DATE(created_at) AS trade_date
       FROM signal_trades
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    ).catch(() => ({ rows: [] }));

    const executed = new Set(
      tradesRes.rows.map(r => {
        const d = r.trade_date instanceof Date
          ? r.trade_date.toISOString().slice(0, 10)
          : String(r.trade_date).slice(0, 10);
        return `${d}_${r.signal_id}`;
      })
    );

    const missed = [];
    const now = new Date();

    // Look back over the last 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(now);
      day.setUTCDate(day.getUTCDate() - dayOffset);
      const dayStr = day.toISOString().slice(0, 10);

      for (const w of SIGNAL_WINDOWS) {
        const windowEnd = new Date(day);
        windowEnd.setUTCHours(w.utcHour, w.utcMinEnd, 0, 0);

        // Skip windows that haven't ended yet (current/future)
        if (windowEnd > now) continue;

        // Skip windows before the user's account was created
        if (windowEnd < accountCreatedAt) continue;

        // Already traded this window
        const key = `${dayStr}_${w.id}`;
        if (executed.has(key)) continue;

        // Determine eligibility for this window
        let qualified = false;
        if (w.isFreeSignal) {
          qualified = freeSignalCredits > 0;
        } else {
          qualified = !!tier && tier.signals.includes(w.id);
        }
        if (!qualified) continue;

        // Format EAT time labels (signal windows are defined in UTC)
        const eatStartHour = (w.utcHour + 3) % 24;
        const timeEAT = `${String(eatStartHour).padStart(2, '0')}:${String(w.utcMinStart).padStart(2, '0')} - ` +
          `${String(eatStartHour).padStart(2, '0')}:${String(w.utcMinEnd).padStart(2, '0')}`;

        missed.push({
          signalId: w.id,
          date: dayStr,
          timeEAT,
          isFreeSignal: !!w.isFreeSignal,
          tradingPair: 'BTC/USDT',
        });
      }
    }

    res.json({ missed });
  } catch (err) {
    console.error('Missed signals error:', err);
    res.status(500).json({ error: err.message, missed: [] });
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
