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
import contractRoutes, { autoLiquidatePositions } from './routes/contract.js';
import referralRoutes from './routes/referrals.js';
import signalRoutes, { settleAllDueSignalTrades } from './routes/signals.js';
import chatRoutes from './routes/chat.js';
import { runPositionAndBalanceAudit } from './utils/audit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Global Auto-Settlement Middleware (Throttled):
// Triggers background checks at most once every 15 seconds to prevent DB connection congestion
let lastAutoSettleTime = 0;
const AUTO_SETTLE_INTERVAL_MS = 15 * 1000;

app.use('/api', (req, res, next) => {
  const now = Date.now();
  if (now - lastAutoSettleTime > AUTO_SETTLE_INTERVAL_MS) {
    lastAutoSettleTime = now;
    settleAllDueSignalTrades().catch(e => console.warn('[auto-settle middleware]', e.message));
    autoLiquidatePositions().catch(e => console.warn('[auto-liquidation middleware]', e.message));
  }
  next();
});


// Fail fast if the critical JWT secret is missing — do not accept a leaked default
if (!process.env.JWT_SECRET && !process.env.VERCEL) {
  console.error('❌ JWT_SECRET environment variable is required. Set it before starting the server.');
  process.exit(1);
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api/signals', signalRoutes);
app.use('/api/chat', chatRoutes);

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
  if (res.headersSent) return next(err);
  console.error('Unhandled server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Fallback to index.html for SPA router (only for non-API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// On Vercel: DB schema is initialized lazily without blocking function execution
let dbInitPromise = null;

function ensureDbInit() {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().catch(err => {
      console.warn('Database initialization warning:', err.message);
      dbInitPromise = null; // retry on next request
    });
  }
  return dbInitPromise;
}

// In local dev, initialize DB and run initial audit
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  ensureDbInit().then(() => {
    runPositionAndBalanceAudit().catch(() => { });
  });
} else {
  // On Vercel, run ensureDbInit in non-blocking background
  ensureDbInit();
}


// For local dev: start listening
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  const startLocal = async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        await ensureDbInit();
        await runPositionAndBalanceAudit().catch(() => { });
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
