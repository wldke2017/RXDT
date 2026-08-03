import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ---- Signal Tier Configuration ----
// Kenya EAT (UTC+3) signal windows in UTC:
// Signal 1: 14:00-14:30 UTC (5pm-5:30pm EAT)
// Signal 2: 15:00-15:30 UTC (6pm-6:30pm EAT)
// Signal 3: 16:00-16:30 UTC (7pm-7:30pm EAT)

const SIGNAL_WINDOWS = [
  { id: 1, utcHour: 14, utcMinStart: 0,  utcMinEnd: 30 },
  { id: 2, utcHour: 15, utcMinStart: 0,  utcMinEnd: 30 },
  { id: 3, utcHour: 16, utcMinStart: 0,  utcMinEnd: 30 },
];

/**
 * Tier rules and doubling math:
 *
 * TIER 1: $100–$499 → doubles in 50 days (3 signals/day, 150 trades)
 *   Per-trade profit % of balance = 2^(1/150) - 1 ≈ 0.4621%
 *   Trade amount = 10% of balance
 *   Return on trade amount = 4.621% per trade
 *   Daily gain = 3 × 0.4621% = 1.386%/day → ×50 = 2.0× ✓
 *
 * TIER 2: $500–$999 → doubles in 28 days (3 signals/day, 84 trades)
 *   Per-trade profit % of balance = 2^(1/84) - 1 ≈ 0.8267%
 *   Trade amount = 10% of balance
 *   Return on trade amount = 8.267% per trade
 *   Daily gain = 3 × 0.8267% = 2.48%/day → ×28 = 2.0× ✓
 *
 * TIER 3: $1000+ → doubles in 21 days (3 signals/day, 63 trades)
 *   Per-trade profit % of balance = 2^(1/63) - 1 ≈ 1.1107%
 *   Trade amount = 10% of balance
 *   Return on trade amount = 11.107% per trade
 *   Daily gain = 3 × 1.1107% = 3.332%/day → ×21 = 2.0× ✓
 */

const SIGNAL_TIERS = {
  TIER1: {
    label: 'Starter',
    minBalance: 100,
    maxBalance: 499.99,
    doubleDays: 50,
    tradePercent: 0.10,        // 10% of balance per trade
    profitOnTradePercent: 0.04621, // 4.621% profit on the trade amount
    profitOnBalancePercent: 0.004621, // 0.4621% of total balance
    signals: [1, 2, 3],
    description: '$100–$499 · Doubles in 50 days'
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
    description: '$500–$999 · Doubles in 28 days'
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
    description: '$1,000+ · Doubles in 21 days'
  }
};

function getTier(balance) {
  if (balance >= 1000) return SIGNAL_TIERS.TIER3;
  if (balance >= 500) return SIGNAL_TIERS.TIER2;
  if (balance >= 100) return SIGNAL_TIERS.TIER1;
  return null;
}

function getActiveSignal() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();

  for (const w of SIGNAL_WINDOWS) {
    if (
      utcHour === w.utcHour &&
      utcMin >= w.utcMinStart &&
      utcMin < w.utcMinEnd
    ) {
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
        minutesRemaining: 30 - utcMin + w.utcMinStart,
      };
    }
  }
  return null;
}

// Middleware: require auth
function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'rxdt_exchange_super_secret_jwt_key_2026');
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Use synchronous JWT verify to avoid async import
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'rxdt_exchange_super_secret_jwt_key_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/signals/active
// Returns current active signal + user qualification status
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const signal = getActiveSignal();
    const userRes = await query(`SELECT available_balance, total_assets FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    const balance = parseFloat(user?.available_balance || 0);
    const tier = getTier(balance);

    // Check if user already executed this signal today
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
        qualified: tier.signals.includes(signal?.signalId),
      } : null,
      qualified: !!tier && !!signal && tier.signals.includes(signal.signalId),
      alreadyExecuted,
    });
  } catch (err) {
    console.error('Signals active error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/signals/execute
// Execute a copy trade for the active signal
router.post('/execute', authMiddleware, async (req, res) => {
  try {
    const signal = getActiveSignal();
    if (!signal) {
      return res.status(400).json({ error: 'No active signal window right now. Please log in at 5pm, 6pm, or 7pm EAT.' });
    }

    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balance = parseFloat(user.available_balance);
    const tier = getTier(balance);

    if (!tier) {
      return res.status(400).json({ error: 'Minimum balance of $100 required to participate in copy trading signals.' });
    }
    if (!tier.signals.includes(signal.signalId)) {
      return res.status(400).json({ error: `Your tier does not qualify for Signal ${signal.signalId}.` });
    }

    // Check if already executed today
    const today = new Date().toISOString().split('T')[0];
    const execCheck = await query(
      `SELECT id FROM signal_trades WHERE user_id = $1 AND signal_id = $2 AND DATE(created_at) = $3`,
      [req.userId, signal.signalId, today]
    ).catch(() => ({ rows: [] }));
    if (execCheck.rows.length > 0) {
      return res.status(400).json({ error: `You have already executed Signal ${signal.signalId} today.` });
    }

    // Calculate trade amounts with slight random variation (±5% of target)
    const tradeAmount = parseFloat((balance * tier.tradePercent).toFixed(2));
    const baseProfitPct = tier.profitOnTradePercent;
    const variation = (Math.random() * 0.10 - 0.05); // ±5% variation
    const actualProfitPct = baseProfitPct * (1 + variation);
    const profitAmount = parseFloat((tradeAmount * actualProfitPct).toFixed(2));
    const newBalance = parseFloat((balance + profitAmount).toFixed(2));

    const tradeId = 'ST' + Date.now();
    const openId = 'AC' + Date.now() + 'O';
    const closeId = 'AC' + Date.now() + 'C';

    // Record the signal trade
    await query(`
      CREATE TABLE IF NOT EXISTS signal_trades (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        signal_id INT NOT NULL,
        pair VARCHAR(20) NOT NULL,
        trade_amount NUMERIC(15, 4) NOT NULL,
        profit NUMERIC(15, 4) NOT NULL,
        balance_before NUMERIC(15, 4) NOT NULL,
        balance_after NUMERIC(15, 4) NOT NULL,
        tier_label VARCHAR(50),
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await query(
      `INSERT INTO signal_trades (id, user_id, signal_id, pair, trade_amount, profit, balance_before, balance_after, tier_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [tradeId, req.userId, signal.signalId, signal.pairSymbol, tradeAmount, profitAmount, balance, newBalance, tier.label]
    );

    // Record Open Position in account_changes
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1, $2, $3, $4, $5, $6)`,
      [openId, req.userId, 'signal_open', -tradeAmount, balance - tradeAmount, `Signal ${signal.signalId} — Open Position (${signal.pairSymbol})`]
    ).catch(() => {});

    // Record Close Position in account_changes
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1, $2, $3, $4, $5, $6)`,
      [closeId, req.userId, 'signal_close', profitAmount + tradeAmount, newBalance, `Signal ${signal.signalId} — Close Position (${signal.pairSymbol}) +${profitAmount.toFixed(4)} USDT`]
    ).catch(() => {});

    // Update user balance and total earnings
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
      }
    });
  } catch (err) {
    console.error('Signal execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/signals/history — User's copy trade history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS signal_trades (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        signal_id INT NOT NULL,
        pair VARCHAR(20) NOT NULL,
        trade_amount NUMERIC(15, 4) NOT NULL,
        profit NUMERIC(15, 4) NOT NULL,
        balance_before NUMERIC(15, 4) NOT NULL,
        balance_after NUMERIC(15, 4) NOT NULL,
        tier_label VARCHAR(50),
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    const result = await query(
      `SELECT * FROM signal_trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ trades: result.rows });
  } catch (err) {
    console.error('Signal history error:', err);
    res.status(500).json({ error: err.message, trades: [] });
  }
});

// GET /api/signals/consume-record — Full account_changes for Consume Record tab
router.get('/consume-record', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM account_changes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.userId]
    ).catch(() => ({ rows: [] }));
    res.json({ records: result.rows });
  } catch (err) {
    console.error('Consume record error:', err);
    res.status(500).json({ error: err.message, records: [] });
  }
});

export default router;
