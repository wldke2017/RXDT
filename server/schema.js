import { query } from './db.js';
import bcrypt from 'bcryptjs';

let isDbInitialized = false;

export async function initDatabase() {
  if (isDbInitialized) return;
  isDbInitialized = true;
  console.log('⚡ Initializing Neon PostgreSQL Database Schemas...');

  // Create Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) UNIQUE,
      email VARCHAR(100),
      password_hash VARCHAR(255) NOT NULL,
      total_assets NUMERIC(15, 2) DEFAULT 0.00,
      available_balance NUMERIC(15, 2) DEFAULT 0.00,
      frozen_balance NUMERIC(15, 2) DEFAULT 0.00,
      total_earnings NUMERIC(15, 2) DEFAULT 0.00,
      invite_code VARCHAR(20) UNIQUE NOT NULL,
      kyc_status VARCHAR(20) DEFAULT 'unverified',
      membership_tier VARCHAR(50) DEFAULT 'Basic',
      email_bound VARCHAR(100),
      email_otp VARCHAR(10),
      email_otp_expires TIMESTAMP WITH TIME ZONE,
      transaction_password VARCHAR(255),
      daily_signal_count INT DEFAULT 3,
      avg_daily_return VARCHAR(50) DEFAULT '1.8% - 2.1%',
      referred_by VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure missing columns exist on existing database instances and allow null phone (email registration)
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_bound VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp VARCHAR(10);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_password VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(50);
    ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
  `).catch(err => console.log('User schema migration notice:', err.message));

  // Create AI Models Table
  await query(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      avatar VARCHAR(50),
      one_day_profit NUMERIC(15, 2) DEFAULT 0,
      one_day_return_rate NUMERIC(5, 2) DEFAULT 0,
      seven_day_profit NUMERIC(15, 2) DEFAULT 0,
      seven_day_return_rate NUMERIC(5, 2) DEFAULT 0,
      fifteen_day_profit NUMERIC(15, 2) DEFAULT 0,
      fifteen_day_return_rate NUMERIC(5, 2) DEFAULT 0,
      thirty_day_profit NUMERIC(15, 2) DEFAULT 0,
      thirty_day_return_rate NUMERIC(5, 2) DEFAULT 0,
      total_followers INT DEFAULT 0,
      total_funds NUMERIC(15, 2) DEFAULT 0,
      commission NUMERIC(5, 2) DEFAULT 5,
      min_order NUMERIC(15, 2) DEFAULT 500,
      max_order NUMERIC(15, 2) DEFAULT 500000,
      win_rate NUMERIC(5, 2) DEFAULT 94.0,
      intro TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create AI Products Table
  await query(`
    CREATE TABLE IF NOT EXISTS ai_products (
      id VARCHAR(50) PRIMARY KEY,
      model_id VARCHAR(50) REFERENCES ai_models(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      period_days INT NOT NULL,
      min_amount NUMERIC(15, 2) NOT NULL,
      max_amount NUMERIC(15, 2) NOT NULL,
      daily_rate NUMERIC(5, 2) NOT NULL,
      status VARCHAR(20) DEFAULT 'active'
    );
  `);

  // Create Follow Orders Table
  await query(`
    CREATE TABLE IF NOT EXISTS follow_orders (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(100) NOT NULL,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      model_id VARCHAR(50) REFERENCES ai_models(id),
      product_name VARCHAR(100) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      daily_rate NUMERIC(5, 2) NOT NULL,
      period_days INT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      profit_loss NUMERIC(15, 2) DEFAULT 0,
      total_profit_loss NUMERIC(15, 2) DEFAULT 0,
      auto_renew BOOLEAN DEFAULT FALSE,
      apply_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Deposits Table
  await query(`
    CREATE TABLE IF NOT EXISTS deposits (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(100) NOT NULL,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(15, 2) NOT NULL,
      coin VARCHAR(20) NOT NULL,
      network VARCHAR(20) NOT NULL,
      address VARCHAR(255),
      tx_hash VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      audit_status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Withdrawals Table
  await query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(100) NOT NULL,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(15, 2) NOT NULL,
      coin VARCHAR(20) NOT NULL,
      network VARCHAR(20) NOT NULL,
      address VARCHAR(255) NOT NULL,
      fee NUMERIC(15, 2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'processing',
      audit_status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Account Changes Audit Table
  await query(`
    CREATE TABLE IF NOT EXISTS account_changes (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      balance_after NUMERIC(15, 2) NOT NULL,
      remark TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Bind Addresses Table
  await query(`
    CREATE TABLE IF NOT EXISTS bind_addresses (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      method VARCHAR(50) DEFAULT 'crypto',
      coin VARCHAR(20) NOT NULL,
      network VARCHAR(20) NOT NULL,
      address VARCHAR(255) NOT NULL,
      label VARCHAR(100) DEFAULT 'Default Wallet',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Lucky Wheel Logs Table
  await query(`
    CREATE TABLE IF NOT EXISTS lucky_wheel_logs (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      user_name VARCHAR(100) NOT NULL,
      prize_name VARCHAR(100) NOT NULL,
      prize_value NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create KYC Records Table
  await query(`
    CREATE TABLE IF NOT EXISTS kyc_records (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      real_name VARCHAR(100) NOT NULL,
      id_number VARCHAR(100) NOT NULL,
      nationality VARCHAR(100),
      document_type VARCHAR(50) DEFAULT 'Passport',
      front_img TEXT,
      back_img TEXT,
      handheld_img TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      reject_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS contract_orders (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(100) NOT NULL,
      user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      pair VARCHAR(20) NOT NULL,
      direction VARCHAR(10) NOT NULL,
      leverage INT NOT NULL DEFAULT 10,
      amount NUMERIC(15, 2) NOT NULL,
      entry_price NUMERIC(15, 4) NOT NULL,
      liquidation_price NUMERIC(15, 4),
      status VARCHAR(20) DEFAULT 'open',
      profit_loss NUMERIC(15, 2) DEFAULT 0,
      close_price NUMERIC(15, 4),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP WITH TIME ZONE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS referral_commissions (
      id VARCHAR(50) PRIMARY KEY,
      referrer_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      level INT DEFAULT 1,
      trade_amount NUMERIC(15, 2) DEFAULT 0,
      amount NUMERIC(15, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Signal Trades Table (Strategy Copy Trading)
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
      status VARCHAR(20) DEFAULT 'open',
      release_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`ALTER TABLE signal_trades ADD COLUMN IF NOT EXISTS release_at TIMESTAMP WITH TIME ZONE;`).catch(() => {});

  // Create System Settings Table (for persistent test signal override on Vercel serverless)
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedInitialData();
  console.log('✅ Database setup and initialization completed successfully.');
}

async function seedInitialData() {
  // Check if AI Models exist
  const modelsCountRes = await query(`SELECT COUNT(*) FROM ai_models;`);
  if (parseInt(modelsCountRes.rows[0].count) === 0) {
    console.log('🌱 Seeding AI Quantitative Models into Neon DB...');
    await query(`
      INSERT INTO ai_models (
        id, name, avatar, one_day_profit, one_day_return_rate, seven_day_profit, seven_day_return_rate,
        fifteen_day_profit, fifteen_day_return_rate, thirty_day_profit, thirty_day_return_rate,
        total_followers, total_funds, commission, min_order, max_order, win_rate, intro
      ) VALUES 
      (
        'AI001', 'RXDT Quant VI Model Alpha', '🤖', 2450.50, 2.10, 16800.00, 14.50,
        38200.00, 32.80, 89500.00, 72.40, 14210, 28500000.00, 5, 500, 500000, 94.8,
        'Proprietary Quantitative AI Model VI developed by Warren Pennington (Ex-Vanguard FinTech Head). High-precision algorithmic execution on BTC, ETH, and NASDAQ-100.'
      ),
      (
        'AI002', 'RXDT Neural Arbitrage v4', '⚡', 1890.00, 1.85, 12630.00, 12.80,
        29100.00, 28.50, 68500.00, 64.00, 9820, 18200000.00, 5, 500, 200000, 92.3,
        'Sub-millisecond cross-exchange liquidity arbitrage AI algorithm operating on KORE / Voyage infrastructure.'
      ),
      (
        'AI003', 'RXDT High-Freq Trend AI', '📈', 3100.00, 2.45, 21700.00, 17.20,
        48500.00, 38.60, 112000.00, 88.00, 21102, 45000000.00, 5, 1000, 1000000, 96.1,
        'Institutional-grade high frequency AI momentum engine targeting top 20 crypto assets.'
      );
    `);

    await query(`
      INSERT INTO ai_products (id, model_id, name, period_days, min_amount, max_amount, daily_rate, status) VALUES
      ('P001', 'AI001', '3-Signal Daily Quantitative Pool', 34, 500, 100000, 1.95, 'active'),
      ('P002', 'AI001', '4-Signal VIP Team Leader Pool', 26, 1000, 500000, 2.60, 'active'),
      ('P003', 'AI002', 'Cross-Exchange Crypto Arbitrage', 34, 500, 200000, 1.85, 'active'),
      ('P004', 'AI003', 'Institutional HFT Pool', 26, 1000, 1000000, 2.70, 'active');
    `);
  }

  // Check if default demo user exists
  const userCountRes = await query(`SELECT COUNT(*) FROM users;`);
  if (parseInt(userCountRes.rows[0].count) === 0) {
    console.log('🌱 Seeding demo user (Raju) into Neon DB...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    await query(`
      INSERT INTO users (
        id, name, phone, email, password_hash, total_assets, available_balance, frozen_balance, total_earnings, invite_code, kyc_status
      ) VALUES (
        'U880192', 'Raju', '9133038028', 'raju@rxdt.com', $1, 12540.00, 8320.50, 4219.50, 2840.25, 'RXDT8028', 'pass'
      );
    `, [hash]);

    // Insert sample bound address for Raju
    await query(`
      INSERT INTO bind_addresses (id, user_id, method, coin, network, address, label) VALUES
      ('BA001', 'U880192', 'crypto', 'USDT', 'TRC-20', 'TQn5gt9JfVE...RkzV', 'Primary USDT Wallet');
    `);

    // Insert sample follow order
    await query(`
      INSERT INTO follow_orders (id, order_number, user_id, model_id, product_name, amount, daily_rate, period_days, status, profit_loss, total_profit_loss, auto_renew) VALUES
      ('FO1001', 'ORD1722600001', 'U880192', 'AI001', '3-Signal Daily Quantitative Pool', 4219.50, 1.95, 34, 'buying', 82.28, 412.50, true);
    `);
  }
}
