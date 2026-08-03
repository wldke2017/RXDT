import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './schema.js';
import authRoutes from './routes/auth.js';
import tradingRoutes from './routes/trading.js';
import walletRoutes from './routes/wallet.js';
import gamificationRoutes from './routes/gamification.js';
import kycRoutes from './routes/kyc.js';
import adminRoutes from './routes/admin.js';
import emailRoutes from './routes/email.js';
import contractRoutes from './routes/contract.js';
import referralRoutes from './routes/referrals.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend files
app.use(express.static(rootDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', tradingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/lucky-wheel', gamificationRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/referrals', referralRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RXDT Exchange Backend API',
    database: 'Neon PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Global JSON error handler - always return JSON, never HTML
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Fallback to index.html for SPA router (only for non-API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Start Server & Connect Database (only start listening if run directly)
// On Vercel: init DB in background, don't block incoming requests
let dbInitPromise = null;

function ensureDbInit() {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().catch(err => {
      console.error('Database connection error in Vercel function:', err);
      dbInitPromise = null; // allow retry on next request
    });
  }
  return dbInitPromise;
}

// Kick off DB init immediately on cold start
ensureDbInit();

// For local dev: start listening
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  const startLocal = async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        await ensureDbInit();
        app.listen(PORT, () => {
          console.log(`\n🚀 RXDT Exchange Backend Server running on http://localhost:${PORT}`);
          console.log(`🐘 Connected to Neon PostgreSQL Database`);
        });
        break;
      } catch (err) {
        console.error(`⚠️ DB connection failed (${retries} retries left):`, err.message);
        retries--;
        dbInitPromise = null;
        if (retries === 0) { console.error('❌ Failed to start server.'); process.exit(1); }
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  };
  startLocal();
}

export default app;
