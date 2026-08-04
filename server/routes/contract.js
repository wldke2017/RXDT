import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Fetch live price from Binance REST API
async function getBinancePrice(symbol) {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
  if (!res.ok) throw new Error(`Failed to fetch price for ${symbol}`);
  const data = await res.json();
  return parseFloat(data.price);
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

  try {
    // Check user balance
    const userRes = await query(`SELECT available_balance FROM users WHERE id = $1`, [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (parseFloat(user.available_balance) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Fetch live entry price from Binance
    const entryPrice = await getBinancePrice(pair);

    // Calculate liquidation price
    // Long: liq = entry * (1 - 1/leverage * 0.9)
    // Short: liq = entry * (1 + 1/leverage * 0.9)
    const liqMultiplier = 0.9 / Number(leverage);
    const liquidationPrice = direction === 'long'
      ? entryPrice * (1 - liqMultiplier)
      : entryPrice * (1 + liqMultiplier);

    const id = `CO${Date.now()}`;
    const orderNumber = `CTR${Date.now()}`;

    // Deduct margin from balance
    await query(
      `UPDATE users SET available_balance = available_balance - $1 WHERE id = $2`,
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

    res.json({
      success: true,
      position: { id, pair, direction, leverage, amount, entryPrice, liquidationPrice },
      message: `${direction === 'long' ? '▲ Long' : '▼ Short'} position opened at $${entryPrice.toFixed(2)}`
    });
  } catch (err) {
    console.error('Open position error:', err);
    res.status(500).json({ error: err.message || 'Failed to open position' });
  }
});

// POST /api/contract/close/:id — close a position
router.post('/close/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const posRes = await query(
      `SELECT * FROM contract_orders WHERE id = $1 AND user_id = $2 AND status = 'open'`,
      [id, req.userId]
    );
    const pos = posRes.rows[0];
    if (!pos) return res.status(404).json({ error: 'Position not found or already closed' });

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

    // Update position
    await query(
      `UPDATE contract_orders 
       SET status = 'closed', profit_loss = $1, close_price = $2, closed_at = NOW()
       WHERE id = $3`,
      [finalPnl, closePrice, id]
    );

    // Credit return amount back to user balance
    await query(
      `UPDATE users SET available_balance = available_balance + $1 WHERE id = $2`,
      [returnAmount, req.userId]
    );

    // Log account change
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

    res.json({
      success: true,
      pnl: finalPnl,
      closePrice,
      returnAmount,
      message: `Position closed. P&L: ${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(2)}`
    });
  } catch (err) {
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
