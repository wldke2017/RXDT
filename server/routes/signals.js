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
 * TIER 1: $100–$499 → doubles in 50 days (3 signals/day, 150 trades)
 *   Per-trade profit % of balance = 2^(1/150) - 1 ≈ 0.4621%
 *   Trade amount = 10% of balance → return on trade = 4.621%
 *   Daily gain: 3 × 0.4621% = 1.386%/day → ×50 days = 2.0× ✓
 *
 * TIER 2: $500–$999 → doubles in 28 days (3 signals/day, 84 trades)
 *   Per-trade profit % of balance = 2^(1/84) - 1 ≈ 0.8267%
 *   Trade amount = 10% of balance → return on trade = 8.267%
 *   Daily gain: 3 × 0.8267% = 2.48%/day → ×28 days = 2.0× ✓
 *
 * TIER 3: $1000+ → doubles in 21 days (3 signals/day, 63 trades)
 *   Per-trade profit % of balance = 2^(1/63) - 1 ≈ 1.1107%
 *   Trade amount = 10% of balance → return on trade = 11.107%
 *   Daily gain: 3 × 1.1107% = 3.332%/day → ×21 days = 2.0× ✓
 */

const SIGNAL_TIERS = {
  TIER1: {
    label: 'Starter',
    minBalance: 100,
    maxBalance: 499.99,
    doubleDays: 50,
    tradePercent: 0.10,
    profitOnTradePercent: 0.04621,
    profitOnBalancePercent: 0.004621,
    signals: [1, 2, 3],
    description: '$100–$499 · Doubles in 50 days',
  },
  TIER2: {
    label: 'Growth',
    minBalance: 500,
    maxBalance: 999.99,
    doubleDays: 28,
    tradePercent: 0.10,
    profitOnTradePercent: 0.08267,
    profitOnBalancePercent: 0.008267,
    signals: [1, 2, 3],
    description: '$500–$999 · Doubles in 28 days',
  },
  TIER3: {
    label: 'VIP',
    minBalance: 1000,
    maxBalance: Infinity,
    doubleDays: 21,
    tradePercent: 0.10,
    profitOnTradePercent: 0.11107,
    profitOnBalancePercent: 0.011107,
    signals: [1, 2, 3],
    description: '$1,000+ · Doubles in 21 days',
  },
};

function getTier(balance, isTestMode = false) {
  if (balance >= 1000) return SIGNAL_TIERS.TIER3;
  if (balance >= 500)  return SIGNAL_TIERS.TIER2;
  if (balance >= 100)  return SIGNAL_TIERS.TIER1;
  if (isTestMode)      return SIGNAL_TIERS.TIER1; // Allow test pop-up even for $0 balance in test mode
  return null;
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

// ---- POST /api/signals/execute ----
router.post('/execute', authMiddleware, async (req, res) => {
  try {
    const signal = await getActiveSignal();
    if (!signal) {
      return res.status(400).json({ error: 'No active signal right now. Log in at 5pm, 6pm, or 7pm EAT.' });
    }

    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balance = parseFloat(user.available_balance);
    const tier = getTier(balance);

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
      return res.status(400).json({ error: `You have already executed Signal ${signal.signalId} today.` });
    }

    // Calculate profit with ±5% variation for realism
    const tradeAmount   = parseFloat((balance * tier.tradePercent).toFixed(2));
    const variation     = Math.random() * 0.10 - 0.05;
    const profitAmount  = parseFloat((tradeAmount * tier.profitOnTradePercent * (1 + variation)).toFixed(4));
    const newBalance    = parseFloat((balance + profitAmount).toFixed(4));

    const now    = Date.now();
    const tradeId = 'ST' + now;
    const openId  = 'AC' + now + 'O';
    const closeId = 'AC' + (now + 1) + 'C';

    // Insert signal trade record
    await query(
      `INSERT INTO signal_trades (id, user_id, signal_id, pair, trade_amount, profit, balance_before, balance_after, tier_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [tradeId, req.userId, signal.signalId, signal.pairSymbol, tradeAmount, profitAmount, balance, newBalance, tier.label]
    );

    // Log Open Position
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      [openId, req.userId, 'signal_open', -tradeAmount, balance - tradeAmount,
       `Signal ${signal.signalId} — Open Position (${signal.pairSymbol})`]
    ).catch(() => {});

    // Log Close Position
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      [closeId, req.userId, 'signal_close', profitAmount + tradeAmount, newBalance,
       `Signal ${signal.signalId} — Close Position (${signal.pairSymbol}) +${profitAmount} USDT`]
    ).catch(() => {});

    // Update user balance
    await query(
      `UPDATE users SET available_balance = $1, total_assets = total_assets + $2, total_earnings = total_earnings + $2 WHERE id = $3`,
      [newBalance, profitAmount, req.userId]
    );

    res.json({
      success: true,
      trade: {
        id: tradeId,
        signalId: signal.signalId,
        pair: signal.tradingPair,
        tradeAmount,
        profit: profitAmount,
        balanceBefore: balance,
        balanceAfter: newBalance,
        tier: tier.label,
      },
    });
  } catch (err) {
    console.error('Signal execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/signals/history ----
router.get('/history', authMiddleware, async (req, res) => {
  try {
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
