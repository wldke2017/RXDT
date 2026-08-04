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
import signalRoutes, { autoExecuteSignals } from './routes/signals.js';

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

// ---- Signal Auto-Execution Scheduler ----
// Signal windows (EAT = UTC+3):
//   Signal 1: 5:00pm EAT  = 14:00 UTC
//   Signal 2: 6:00pm EAT  = 15:00 UTC
//   Signal 3: 7:00pm EAT  = 16:00 UTC
// The scheduler fires at each exact minute (e.g. 14:00:30 UTC)
// and runs autoExecuteSignals() for all eligible users.
const SIGNAL_SCHEDULE_MINUTES = [
  { hour: 14, minute: 0, label: 'Signal 1 (5:00 PM EAT)' },
  { hour: 15, minute: 0, label: 'Signal 2 (6:00 PM EAT)' },
  { hour: 16, minute: 0, label: 'Signal 3 (7:00 PM EAT)' },
];

// Track which signal/day we've already auto-executed to avoid duplicates
const autoExecutedTracker = new Map(); // key: `${YYYY-MM-DD}:${signalId}`

function getSignalKey(signalId) {
  const today = new Date().toISOString().split('T')[0];
  return `${today}:${signalId}`;
}

async function runScheduledAutoExecute() {
  try {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();

    // Find which signal window we're in (should be exactly on the minute)
    const signalWindow = SIGNAL_SCHEDULE_MINUTES.find(
      w => w.hour === utcHour && w.minute === utcMin
    );

    if (!signalWindow) return;

    const signalId = SIGNAL_SCHEDULE_MINUTES.indexOf(signalWindow) + 1;
    const key = getSignalKey(signalId);

    // Skip if we already auto-executed this signal today
    if (autoExecutedTracker.has(key)) return;

    autoExecutedTracker.set(key, true);
    console.log(`⏰ Auto-executing ${signalWindow.label} at ${now.toISOString()}...`);

    const result = await autoExecuteSignals();
    console.log(`📊 Auto-execute result:`, result);
  } catch (err) {
    console.error('❌ Auto-execute scheduler error:', err);
  }
}

function startSignalScheduler() {
  // Check every 30 seconds and fire on the exact signal minute
  setInterval(runScheduledAutoExecute, 30 * 1000);

  // Also check immediately on startup (catch-up for missed windows within the last hour)
  setTimeout(() => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();

    // If we're within the first 10 minutes of a signal window, auto-execute
    // (handles server restart mid-window)
    const catchUpWindow = SIGNAL_SCHEDULE_MINUTES.find(w => {
      const totalMin = w.hour * 60 + w.minute;
      const nowTotalMin = utcHour * 60 + utcMin;
      return nowTotalMin >= totalMin && nowTotalMin < totalMin + 10;
    });

    if (catchUpWindow) {
      const signalId = SIGNAL_SCHEDULE_MINUTES.indexOf(catchUpWindow) + 1;
      const key = getSignalKey(signalId);
      if (!autoExecutedTracker.has(key)) {
        autoExecutedTracker.set(key, true);
        console.log(`⏰ Catch-up auto-execute for ${catchUpWindow.label}...`);
        autoExecuteSignals().catch(err => console.error('Catch-up auto-execute error:', err));
      }
    }
  }, 5000);
}

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
        // Start the signal auto-execution scheduler
        startSignalScheduler();
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
