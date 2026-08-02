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

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RXDT Exchange Backend API',
    database: 'Neon PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA router
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Start Server & Connect Database
async function startServer() {
  let retries = 5;
  while (retries > 0) {
    try {
      await initDatabase();
      app.listen(PORT, () => {
        console.log(`\n🚀 RXDT Exchange Backend Server running on http://localhost:${PORT}`);
        console.log(`🐘 Connected to Neon PostgreSQL Database`);
      });
      break;
    } catch (err) {
      console.error(`⚠️ Database connection attempt failed (${retries} retries left):`, err.message);
      retries--;
      if (retries === 0) {
        console.error('❌ Failed to start server after multiple retries.');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

startServer();

