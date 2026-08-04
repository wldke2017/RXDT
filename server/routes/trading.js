import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get AI Models & Products
router.get('/ai-models', async (req, res) => {
  try {
    const modelsRes = await query(`SELECT * FROM ai_models ORDER BY id ASC;`);
    const productsRes = await query(`SELECT * FROM ai_products WHERE status = 'active';`);

    const models = modelsRes.rows.map(m => {
      const prods = productsRes.rows
        .filter(p => p.model_id === m.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          period: p.period_days,
          minAmount: parseFloat(p.min_amount),
          maxAmount: parseFloat(p.max_amount),
          dailyRate: parseFloat(p.daily_rate),
          status: p.status
        }));

      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        oneDayProfit: parseFloat(m.one_day_profit),
        oneDayReturnRate: parseFloat(m.one_day_return_rate),
        sevenDayProfit: parseFloat(m.seven_day_profit),
        sevenDayReturnRate: parseFloat(m.seven_day_return_rate),
        fifteenDayProfit: parseFloat(m.fifteen_day_profit),
        fifteenDayReturnRate: parseFloat(m.fifteen_day_return_rate),
        thirtyDayProfit: parseFloat(m.thirty_day_profit),
        thirtyDayReturnRate: parseFloat(m.thirty_day_return_rate),
        totalFollowers: parseInt(m.total_followers),
        totalFunds: parseFloat(m.total_funds),
        commission: parseFloat(m.commission),
        minOrder: parseFloat(m.min_order),
        maxOrder: parseFloat(m.max_order),
        winRate: parseFloat(m.win_rate),
        intro: m.intro,
        products: prods
      };
    });

    res.json({ aiModels: models });
  } catch (err) {
    console.error('Fetch AI Models error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User Follow Orders
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const ordersRes = await query(
      `SELECT * FROM follow_orders WHERE user_id = $1 ORDER BY apply_time DESC;`,
      [req.user.id]
    );

    const orders = ordersRes.rows.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      userId: o.user_id,
      modelId: o.model_id,
      productName: o.product_name,
      amount: parseFloat(o.amount),
      dailyRate: parseFloat(o.daily_rate),
      periodDays: o.period_days,
      status: o.status,
      profitLoss: parseFloat(o.profit_loss),
      totalProfitLoss: parseFloat(o.total_profit_loss),
      autoRenew: o.auto_renew,
      applyTime: o.apply_time ? new Date(o.apply_time).toISOString().replace('T', ' ').slice(0, 19) : ''
    }));

    res.json({ orders });
  } catch (err) {
    console.error('Fetch Orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Follow Order
router.post('/orders/create', requireAuth, async (req, res) => {
  try {
    const { modelId, productName, amount, dailyRate, periodDays } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid investment amount' });
    }

    // Check user available balance in Neon DB
    const userRes = await query(`SELECT available_balance, frozen_balance FROM users WHERE id = $1;`, [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const available = parseFloat(userRes.rows[0].available_balance);
    const frozen = parseFloat(userRes.rows[0].frozen_balance);

    if (available < numAmount) {
      return res.status(400).json({ error: 'Insufficient available balance' });
    }

    const orderId = 'FO' + Date.now();
    const orderNum = 'ORD' + Date.now();
    const newAvailable = available - numAmount;
    const newFrozen = frozen + numAmount;

    // Execute atomic SQL transaction
    await query('BEGIN');

    await query(`
      UPDATE users SET available_balance = $1, frozen_balance = $2 WHERE id = $3;
    `, [newAvailable, newFrozen, req.user.id]);

    const newOrderRes = await query(`
      INSERT INTO follow_orders (
        id, order_number, user_id, model_id, product_name, amount, daily_rate, period_days, status, auto_renew
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'buying', true)
      RETURNING *;
    `, [orderId, orderNum, req.user.id, modelId, productName || 'AI Quantitative Strategy', numAmount, dailyRate || 1.95, periodDays || 34]);

    // Record Account Change log
    await query(`
      INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
      VALUES ($1, $2, 'AI Quant Investment', $3, $4, $5);
    `, ['AC' + Date.now(), req.user.id, -numAmount, newAvailable, `Invested in ${productName || 'AI Strategy'}`]);

    await query('COMMIT');

    const o = newOrderRes.rows[0];
    res.json({
      message: 'AI Order created successfully!',
      order: {
        id: o.id,
        orderNumber: o.order_number,
        userId: o.user_id,
        modelId: o.model_id,
        productName: o.product_name,
        amount: parseFloat(o.amount),
        dailyRate: parseFloat(o.daily_rate),
        periodDays: o.period_days,
        status: o.status,
        profitLoss: parseFloat(o.profit_loss),
        totalProfitLoss: parseFloat(o.total_profit_loss),
        autoRenew: o.auto_renew,
        applyTime: new Date(o.apply_time).toISOString().replace('T', ' ').slice(0, 19)
      },
      updatedBalance: {
        availableBalance: newAvailable,
        frozenBalance: newFrozen
      }
    });

  } catch (err) {
    await query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Toggle Auto Renew
router.post('/orders/toggle-autorenew', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const orderRes = await query(`SELECT auto_renew FROM follow_orders WHERE id = $1 AND user_id = $2;`, [orderId, req.user.id]);
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const newStatus = !orderRes.rows[0].auto_renew;
    await query(`UPDATE follow_orders SET auto_renew = $1 WHERE id = $2;`, [newStatus, orderId]);

    res.json({ success: true, autoRenew: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle auto renew' });
  }
});

export default router;
