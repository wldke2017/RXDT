import express from 'express';

const router = express.Router();

// Deprecated AI Models & Follow Orders endpoints (returns empty for compatibility)
router.get('/ai-models', (req, res) => {
  res.json({ aiModels: [] });
});

router.get('/orders', (req, res) => {
  res.json({ orders: [] });
});

router.post('/orders/create', (req, res) => {
  res.status(400).json({ error: 'AI Model subscriptions are deprecated. Please use Signal Copy Trading.' });
});

router.post('/orders/toggle-autorenew', (req, res) => {
  res.status(400).json({ error: 'Deprecated endpoint' });
});

export default router;
