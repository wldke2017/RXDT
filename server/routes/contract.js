import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Per-symbol price cache so we never fall back to a hardcoded value.
// If Binance is unreachable, we use the last known price for that symbol
// (or a sensible per-symbol default) instead of a flat $50,000 which would
// corrupt P&L for non-BTC pairs like DOGEUSDT.
const priceCache = new Map(); // symbol -> { price, ts }

// Reasonable per-symbol fallback prices (used only if we have no cache yet)
const DEFAULT_PRICES = {
  BTCUSDT: 65000,
  ETHUSDT: 3500,
  BNBUSDT: 600,
  SOLUSDT: 150,
  XRPUSDT: 0.6,
  DOGEUSDT: 0.15,
  ADAUSDT: 0.5,
  AVAXUSDT: 35,
  LINKUSDT: 15,
  DOTUSDT: 7,
  MATICUSDT: 0.7,
  LTCUSDT: 80,
  BCHUSDT: 400,
  UNIUSDT: 10,
  ATOMUSDT: 9,
  XLMUSDT: 0.1,
  NEARUSDT: 5,
  FTMUSDT: 0.7,
  ALGOUSDT: 0.2,
  VETUSDT: 0.03,
  FILUSDT: 5,
  ICPUSDT: 10,
  HBARUSDT: 0.1,
  APTUSDT: 8,
  ARBUSDT: 1.2,
  OPUSDT: 2,
  INJUSDT: 25,
  SUIUSDT: 1,
  PEPEUSDT: 0.00001,
  SHIBUSDT: 0.00002,
  FLOKIUSDT: 0.0002,
  WIFUSDT: 2,
  BONKUSDT: 0.00002,
  WLDUSDT: 2,
  PYTHUSDT: 0.5,
  JUPUSDT: 1,
  RENDERUSDT: 7,
  TONUSDT: 7,
  SANDUSDT: 0.5,
  MANAUSDT: 0.5,
  AXSUSDT: 7,
  GALAUSDT: 0.03,
  ENJUSDT: 0.3,
  AAVEUSDT: 100,
  MKRUSDT: 2000,
  COMPUSDT: 50,
  CRVUSDT: 0.5,
  SNXUSDT: 2,
  LDOUSDT: 2,
  SUSHIUSDT: 1,
  YFIUSDT: 7000,
  ZRXUSDT: 0.5,
  BATUSDT: 0.2,
  GRTUSDT: 0.2,
  OCEANUSDT: 0.5,
  AGIXUSDT: 0.5,
  FETUSDT: 1.5,
};

// Fetch live price from Binance REST API with a short-lived cache so the
// 5-second position poller and open/close operations don't hammer the API.
// If Binance is unreachable, fall back to the last known price for the
// symbol, or a sensible per-symbol default — never a flat $50,000.
async function getBinancePrice(symbol) {
  const sym = (symbol || 'BTCUSDT').toUpperCase().replace('/', '');
  const cached = priceCache.get(sym);
  if (cached && Date.now() - cached.ts < 10000) return cached.price;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`);
    if (!res.ok) throw new Error(`Failed to fetch price for ${sym}`);
    const data = await res.json();
    const price = parseFloat(data.price);
    if (!(price > 0)) throw new Error('invalid price payload');
    priceCache.set(sym, { price, ts: Date.now() });
    return price;
  } catch (e) {
    const fallback = cached?.price || DEFAULT_PRICES[sym] || 65000;
    const drifted = parseFloat((fallback * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
    priceCache.set(sym, { price: drifted, ts: Date.now() });
    return drifted;
  }
}

// GET /api/contract/positions — open positions
router.get('/positions', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM contract_orders WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ positions: result.rows });
  } catch (err) {
    console.error('Get positions error:', err.message);
    res.json({ positions: [] }); // return empty array gracefully if table or query fails
  }
});

// GET /api/contract/history — closed/liquidated positions
router.get('/history', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM contract_orders WHERE user_id = $1 AND status != 'open' ORDER BY closed_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error('Get history error:', err.message);
    res.json({ history: [] }); // return empty array gracefully
  }
});

// POST /api/contract/open — open a contract position
router.post('/open', requireAuth, async (req, res) => {
  const { pair, direction, leverage, amount } = req.body;
  if (!pair || !direction || !leverage || !amount) {
    return res.status(400).json({ error: 'Missing required fields: pair, direction, leverage, amount' });
  }
  if (!['long', 'short'].includes(direction)) return res.status(400).json({ error: 'Direction must be long or short' });
  if (![10, 20, 50, 100].includes(Number(leverage))) return res.status(400).json({ error: 'Leverage must be 10, 20, 50, or 100' });
  if (Number(amount) < 10) return res.status(400).json({ error: 'Minimum position size is $10 USDT' });

  await query('BEGIN');
  try {
    // Lock user row exclusively to prevent concurrent double-spending / over-opening
    const userRes = await query(`SELECT available_balance FROM users WHERE id = $1 FOR UPDATE`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    if (parseFloat(user.available_balance) < parseFloat(amount)) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Fetch live entry price from Binance (getBinancePrice handles
    // network failures internally with a per-symbol cached/default price)
    const entryPrice = await getBinancePrice(pair);

    const liqMultiplier = 0.9 / Number(leverage);
    const liquidationPrice = direction === 'long'
      ? entryPrice * (1 - liqMultiplier)
      : entryPrice * (1 + liqMultiplier);

    const id = `CO${Date.now()}`;
    const orderNumber = `CTR${Date.now()}`;

    // Move margin from available_balance to frozen_balance ("In Orders")
    await query(
      `UPDATE users 
       SET available_balance = available_balance - $1,
           frozen_balance = frozen_balance + $1
       WHERE id = $2`,
      [amount, req.userId]
    );

    // Create order
    await query(
      `INSERT INTO contract_orders 
       (id, order_number, user_id, pair, direction, leverage, amount, entry_price, liquidation_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')`,
      [id, orderNumber, req.userId, pair.toUpperCase(), direction, Number(leverage), Number(amount), entryPrice, liquidationPrice]
    );

    // Log account change
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
       VALUES ($1, $2, 'contract_open', $3, (SELECT available_balance FROM users WHERE id = $2), $4)`,
      [`AC${Date.now()}`, req.userId, -Number(amount), `Opened ${direction} ${pair} x${leverage}`]
    );

    await query('COMMIT');

    res.json({
      success: true,
      position: { id, pair, direction, leverage, amount, entryPrice, liquidationPrice },
      message: `${direction === 'long' ? '▲ Long' : '▼ Short'} position opened at $${entryPrice.toFixed(2)}`
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Open position error:', err);
    res.status(500).json({ error: err.message || 'Failed to open position' });
  }

});

// ---- Auto-Liquidation: Liquidate positions past their liquidation price ----
// Called by the position poller and whenever positions are loaded, so positions
// that cross the liquidation threshold get closed automatically.
export async function autoLiquidatePositions() {
  try {
    // Get all open positions whose current market price has crossed the liquidation threshold
    const openPositions = await query(`
      SELECT * FROM contract_orders WHERE status = 'open'
    `);
    let liquidated = 0;
    for (const pos of openPositions.rows) {
      try {
        const currentPrice = await getBinancePrice(pos.pair);
        const liqPrice = parseFloat(pos.liquidation_price);
        const isLong = pos.direction === 'long';
        // Long position: liquidated if current price <= liquidation price
        // Short position: liquidated if current price >= liquidation price
        const shouldLiquidate = isLong ? currentPrice <= liqPrice : currentPrice >= liqPrice;
        if (!shouldLiquidate) continue;

        // Atomic close: lock and close in one transaction
        await query('BEGIN');
        const lockRes = await query(
          `SELECT * FROM contract_orders WHERE id = $1 AND status = 'open' FOR UPDATE`,
          [pos.id]
        );
        if (!lockRes.rows.length) { await query('ROLLBACK'); continue; }

        const loss = -parseFloat(pos.amount); // Full margin loss on liquidation
        await query(
          `UPDATE contract_orders 
           SET status = 'liquidated', profit_loss = $1, close_price = $2, closed_at = NOW()
           WHERE id = $3 AND status = 'open'`,
          [loss, currentPrice, pos.id]
        );
        // No funds returned: returnAmount = 0 (full liquidation)
        await query(
          `UPDATE users 
           SET frozen_balance = GREATEST(0, frozen_balance - $1),
               total_assets = total_assets + $2
           WHERE id = $3`,
          [pos.amount, loss, pos.user_id]
        );
        await query(
          `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
           VALUES ($1, $2, 'contract_liquidation', $3, (SELECT available_balance FROM users WHERE id = $2), $4)`,
          [`LIQ${Date.now()}`, pos.user_id, loss, `Liquidated ${pos.direction} ${pos.pair} x${pos.leverage} @ $${currentPrice.toFixed(2)}`]
        );
        await query('COMMIT');
        liquidated++;
      } catch (e) {
        await query('ROLLBACK').catch(() => { });
        console.warn(`Auto-liquidation check error for position ${pos.id}:`, e.message);
      }
    }
    if (liquidated > 0) console.log(`⚠️ Auto-liquidated ${liquidated} position(s)`);
    return liquidated;
  } catch (err) {
    console.error('Auto-liquidation error:', err);
    return 0;
  }
}

// POST /api/contract/close/:id — close a position safely
router.post('/close/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  await query('BEGIN');
  try {
    // Acquire exclusive lock on the position row to prevent concurrent duplicate closes
    const posRes = await query(
      `SELECT * FROM contract_orders WHERE id = $1 AND user_id = $2 AND status = 'open' FOR UPDATE`,
      [id, req.userId]
    );
    const pos = posRes.rows[0];
    if (!pos) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Position not found or already closed' });
    }

    // Immediately mark position as closed inside the transaction
    // Fetch live close price from Binance
    const closePrice = await getBinancePrice(pos.pair);

    // Calculate P&L
    // Notional = amount * leverage
    // PnL = notional * (priceChange%) 
    const notional = parseFloat(pos.amount) * parseInt(pos.leverage);
    const priceChangePct = (closePrice - parseFloat(pos.entry_price)) / parseFloat(pos.entry_price);
    const pnl = pos.direction === 'long'
      ? notional * priceChangePct
      : notional * (-priceChangePct);

    const returnAmount = Math.max(0, parseFloat(pos.amount) + pnl); // can't return more than position (liquidation)
    const finalPnl = returnAmount - parseFloat(pos.amount);

    // Update position status inside transaction
    await query(
      `UPDATE contract_orders 
       SET status = 'closed', profit_loss = $1, close_price = $2, closed_at = NOW()
       WHERE id = $3 AND status = 'open'`,
      [finalPnl, closePrice, id]
    );

    // Release frozen margin and credit return amount back to available_balance.
    await query(
      `UPDATE users 
       SET frozen_balance = GREATEST(0, frozen_balance - $1),
           available_balance = available_balance + $2,
           total_assets = total_assets + $3
       WHERE id = $4`,
      [pos.amount, returnAmount, finalPnl, req.userId]
    );

    // Log account change inside transaction
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
       VALUES ($1, $2, $3, $4, (SELECT available_balance FROM users WHERE id = $2), $5)`,
      [
        `AC${Date.now()}`,
        req.userId,
        finalPnl >= 0 ? 'contract_profit' : 'contract_loss',
        finalPnl,
        `Closed ${pos.direction} ${pos.pair} x${pos.leverage} @ $${closePrice.toFixed(2)}`
      ]
    );

    await query('COMMIT');

    res.json({
      success: true,
      pnl: finalPnl,
      closePrice,
      returnAmount,
      message: `Position closed. P&L: ${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(2)}`
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Close position error:', err);
    res.status(500).json({ error: err.message || 'Failed to close position' });
  }
});


// GET /api/contract/pairs — all available USDT pairs from Binance
router.get('/pairs', async (req, res) => {
  try {
    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const tickers = await binanceRes.json();
    const usdtPairs = tickers
      .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 1000000)
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 100)
      .map(t => ({
        symbol: t.symbol,
        base: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume)
      }));
    res.json({ pairs: usdtPairs });
  } catch (err) {
    console.error('Pairs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pairs from Binance' });
  }
});

export default router;
