import express from 'express';
import { query } from '../db.js';

const router = express.Router();

export function requireAdminSecret(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'] || req.query.admin_secret;
  const expectedSecret = process.env.ADMIN_SECRET;
  if (!expectedSecret) {
    console.error('❌ ADMIN_SECRET environment variable is required for admin routes.');
    return res.status(503).json({ error: 'Admin routes not configured.' });
  }
  if (!adminSecret || adminSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Access denied: Invalid Admin Secret' });
  }
  next();
}

// ----------------------------------------------------
// STATS OVERVIEW
// ----------------------------------------------------
router.get('/stats', requireAdminSecret, async (req, res) => {
  try {
    const [users, deposits, withdrawals, kyc, signals] = await Promise.all([
      query(`SELECT COUNT(*) as count, SUM(available_balance) as total_balance FROM users`),
      query(`SELECT COUNT(*) as count FROM deposits WHERE audit_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM withdrawals WHERE audit_status = 'pending'`),
      query(`SELECT COUNT(*) as count FROM kyc_records WHERE status = 'pending'`),
      query(`SELECT COUNT(*) as count, SUM(profit) as total_profit FROM signal_trades`).catch(() => ({ rows: [{ count: 0, total_profit: 0 }] })),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalBalance: parseFloat(users.rows[0].total_balance || 0),
      pendingDeposits: parseInt(deposits.rows[0].count),
      pendingWithdrawals: parseInt(withdrawals.rows[0].count),
      pendingKyc: parseInt(kyc.rows[0].count),
      totalSignalTrades: parseInt(signals.rows[0].count),
      totalSignalProfit: parseFloat(signals.rows[0].total_profit || 0),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ----------------------------------------------------
// PENDING (deposits, withdrawals, KYC)
// ----------------------------------------------------
router.get('/pending', requireAdminSecret, async (req, res) => {
  try {
    const deposits = await query(`
      SELECT d.*, u.phone as user_phone, u.name as user_name 
      FROM deposits d LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.audit_status = 'pending' ORDER BY d.created_at DESC`);
    const withdrawals = await query(`
      SELECT w.*, u.phone as user_phone, u.name as user_name 
      FROM withdrawals w LEFT JOIN users u ON w.user_id = u.id 
      WHERE w.audit_status = 'pending' ORDER BY w.created_at DESC`);
    const kycRecords = await query(`
      SELECT k.*, u.phone as user_phone, u.name as user_name 
      FROM kyc_records k LEFT JOIN users u ON k.user_id = u.id 
      WHERE k.status = 'pending' ORDER BY k.created_at DESC`);
    res.json({
      pendingDeposits: deposits.rows,
      pendingWithdrawals: withdrawals.rows,
      pendingKyc: kycRecords.rows
    });
  } catch (err) {
    console.error('Admin pending fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// ----------------------------------------------------
// USERS LIST + BALANCE ADJUST
// ----------------------------------------------------
router.get('/users', requireAdminSecret, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, phone, email, available_balance, total_assets, total_earnings,
             kyc_status, invite_code, created_at
      FROM users ORDER BY created_at DESC LIMIT 200`);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users/balance', requireAdminSecret, async (req, res) => {
  try {
    const { userId, amount, remark } = req.body;
    if (!userId || amount === undefined) return res.status(400).json({ error: 'userId and amount required' });
    const amt = parseFloat(amount);
    const userRes = await query(
      `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1
       WHERE id = $2 RETURNING id, name, available_balance, total_assets`,
      [amt, userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = userRes.rows[0];
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['AC' + Date.now(), userId, 'admin_adjustment', amt, u.available_balance, remark || 'Admin balance adjustment']
    );
    res.json({ message: `Balance updated for ${u.name}. New balance: $${parseFloat(u.available_balance).toFixed(2)}`, user: u });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// ----------------------------------------------------
// RELEASE FROZEN ("IN ORDERS") FUNDS
// ----------------------------------------------------
// Releases a user's frozen_balance back to available_balance.
// Optionally pass { userId } to release for a single user, or omit to
// release for ALL users with stuck funds (e.g. legacy users whose
// signal trades never settled).
router.post('/users/release-frozen', requireAdminSecret, async (req, res) => {
  try {
    const { userId } = req.body || {};

    let users;
    if (userId) {
      const res = await query(
        `SELECT id, name, frozen_balance, available_balance FROM users WHERE id = $1 AND frozen_balance > 0`,
        [userId]
      );
      users = res.rows;
    } else {
      const res = await query(
        `SELECT id, name, frozen_balance, available_balance FROM users WHERE frozen_balance > 0`
      );
      users = res.rows;
    }

    if (!users.length) {
      return res.json({ message: userId ? 'No frozen funds to release for this user.' : 'No users have frozen funds to release.', released: 0 });
    }

    let releasedCount = 0;
    let releasedTotal = 0;
    let releasedProfit = 0;

    for (const u of users) {
      const frozen = parseFloat(u.frozen_balance);
      if (frozen <= 0) continue;

      await query('BEGIN');

      // Sum up profits from any open signal trades so they're credited too
      const openTrades = await query(
        `SELECT COALESCE(SUM(profit), 0) as total_profit FROM signal_trades WHERE user_id = $1 AND status = 'open'`,
        [u.id]
      ).catch(() => ({ rows: [{ total_profit: 0 }] }));
      const openProfit = parseFloat(openTrades.rows[0]?.total_profit || 0);

      const totalRelease = frozen + openProfit;

      const upd = await query(
        `UPDATE users 
         SET frozen_balance = GREATEST(0, frozen_balance - $1),
             available_balance = available_balance + $2,
             total_assets = total_assets + $2,
             total_earnings = total_earnings + $3
         WHERE id = $4 RETURNING available_balance`,
        [frozen, totalRelease, openProfit, u.id]
      );
      const newBal = parseFloat(upd.rows[0]?.available_balance || 0);

      // Mark any open signal trades as completed so they don't re-settle
      // (also stamp settlement price/time so Copy Trade History stays complete)
      await query(
        `UPDATE signal_trades
         SET status = 'completed',
             settlement_price = COALESCE(settlement_price, purchase_price),
             settled_at = NOW()
         WHERE user_id = $1 AND status = 'open'`,
        [u.id]

      ).catch(() => { });

      await query(
        `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
        ['AC' + Date.now() + 'RF', u.id, 'admin_release', totalRelease, newBal,
          `Admin released frozen (In Orders) funds + profit back to available balance`]
      ).catch(() => { });

      await query('COMMIT');
      releasedCount++;
      releasedTotal += totalRelease;
      releasedProfit += openProfit;
    }

    res.json({
      message: `Released $${releasedTotal.toFixed(2)} (incl. $${releasedProfit.toFixed(2)} profit) across ${releasedCount} user(s).`,
      released: releasedCount,
      releasedTotal,
      releasedProfit
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    console.error('Release frozen error:', err);
    res.status(500).json({ error: 'Failed to release frozen funds' });
  }
});

import { setTestSignalWindow, clearTestSignalWindow, getTestSignalStatus, autoExecuteEligibleSignals } from './signals.js';

// ----------------------------------------------------
// SIGNAL TEST TRIGGER (ADMIN DEMO MODE)
// ----------------------------------------------------
router.get('/signal-status', requireAdminSecret, async (req, res) => {
  const status = await getTestSignalStatus();
  res.json({ isTestActive: !!status, testSignal: status });
});

router.post('/trigger-signal', requireAdminSecret, async (req, res) => {
  const { action, signalId, duration } = req.body;
  if (action === 'stop') {
    await clearTestSignalWindow();
    return res.json({ message: '🛑 Test signal deactivated.' });
  }

  const mins = parseInt(duration || 15);
  const sigId = parseInt(signalId || 1);
  await setTestSignalWindow(mins, sigId);
  res.json({ message: `🚀 Test Signal ${sigId} triggered for ${mins} minutes! Users will now see the pop-up modal.` });
});

// ----------------------------------------------------
// AUTO-EXECUTE SIGNALS FOR ALL ELIGIBLE USERS
// ----------------------------------------------------
router.post('/auto-execute-signals', requireAdminSecret, async (req, res) => {
  const result = await autoExecuteEligibleSignals();
  const prefix = result.executed > 0 ? '✅' : 'ℹ️';
  res.json({ message: `${prefix} ${result.message}`, executed: result.executed, skipped: result.skipped });
});

// ----------------------------------------------------
// SIGNAL TRADES LIST
// ----------------------------------------------------
router.get('/signal-trades', requireAdminSecret, async (req, res) => {
  try {
    const result = await query(`
      SELECT st.*, u.name as user_name, u.phone as user_phone
      FROM signal_trades st LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC LIMIT 200
    `).catch(() => ({ rows: [] }));
    res.json({ trades: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch signal trades', trades: [] });
  }
});

// ----------------------------------------------------
// KYC APPROVE / REJECT
// ----------------------------------------------------
router.post('/kyc/approve', requireAdminSecret, async (req, res) => {
  try {
    const { kycId } = req.body;
    if (!kycId) return res.status(400).json({ error: 'kycId is required' });
    await query('BEGIN');
    const kycRes = await query(`UPDATE kyc_records SET status = 'pass' WHERE id = $1 RETURNING *`, [kycId]);
    const kyc = kycRes.rows[0];
    await query(`UPDATE users SET kyc_status = 'pass', avatar_img = COALESCE(NULLIF($2, ''), avatar_img) WHERE id = $1`, [kyc.user_id, kyc.handheld_img || '']);
    await query('COMMIT');
    res.json({ message: `KYC for ${kyc.real_name} approved!` });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
});

router.post('/kyc/reject', requireAdminSecret, async (req, res) => {
  try {
    const { kycId, reason } = req.body;
    if (!kycId) return res.status(400).json({ error: 'kycId is required' });
    await query('BEGIN');
    const kycRes = await query(
      `UPDATE kyc_records SET status = 'rejected', reject_reason = $2 WHERE id = $1 RETURNING *`,
      [kycId, reason || 'Unclear documents']
    );
    if (!kycRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'KYC not found' }); }
    await query(`UPDATE users SET kyc_status = 'rejected' WHERE id = $1`, [kycRes.rows[0].user_id]);
    await query('COMMIT');
    res.json({ message: `KYC for ${kycRes.rows[0].real_name} rejected.` });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
});

// ----------------------------------------------------
// DEPOSITS APPROVE / REJECT
// ----------------------------------------------------
router.post('/deposits/approve', requireAdminSecret, async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) return res.status(400).json({ error: 'depositId is required' });
    await query('BEGIN');
    const depRes = await query(`SELECT * FROM deposits WHERE id = $1 FOR UPDATE`, [depositId]);
    if (!depRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'Deposit not found' }); }
    const dep = depRes.rows[0];
    if (dep.audit_status !== 'pending') { await query('ROLLBACK'); return res.status(400).json({ error: `Already ${dep.audit_status}` }); }
    const amount = parseFloat(dep.amount);
    // Lucky Wheel spin rules:
    // - Deposit < $500: 1 spin
    // - Deposit >= $500: 2 spins
    // - Deposit >= $1000: 3 spins (+1 for every extra $500)
    // - Max 10 spins per deposit
    let awardedSpins = 1;
    if (amount >= 1000) {
      awardedSpins = 3 + Math.floor((amount - 1000) / 500);
    } else if (amount >= 500) {
      awardedSpins = 2;
    }
    awardedSpins = Math.min(awardedSpins, 10);

    await query(`UPDATE deposits SET status = 'success', audit_status = 'approved' WHERE id = $1`, [depositId]);

    // Fetch user's current deposit state to determine if this is their FIRST deposit
    const depUserRes = await query(
      `SELECT total_deposits, initial_deposit, has_received_deposit_bonus, referred_by FROM users WHERE id = $1`,
      [dep.user_id]
    );
    const depUser = depUserRes.rows[0];
    const prevTotalDeposits = parseFloat(depUser?.total_deposits || 0);
    const isFirstDeposit = prevTotalDeposits <= 0;

    // Set last_deposit_amount and reset spin_winnings_used so the new deposit
    // establishes a fresh 1%-10% win cap for the Lucky Wheel.
    // Also track total_deposits and initial_deposit for tier & doubling logic.
    const userRes = await query(
      `UPDATE users SET 
         available_balance = available_balance + $1, 
         total_assets = total_assets + $1, 
         spin_chances = spin_chances + $2, 
         last_deposit_amount = $1, 
         spin_winnings_used = 0,
         total_deposits = total_deposits + $1,
         initial_deposit = CASE WHEN initial_deposit = 0 THEN $1 ELSE initial_deposit END
       WHERE id = $3 RETURNING available_balance, spin_chances, total_deposits, initial_deposit`,
      [amount, awardedSpins, dep.user_id]
    );

    // 4% first-deposit bonus: credited to the depositor AND their referrer
    let bonusMessage = '';
    if (isFirstDeposit) {
      const bonus = parseFloat((amount * 0.04).toFixed(2));
      if (bonus > 0) {
        // --- Bonus to the depositor ---
        const bonusUserRes = await query(
          `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1, has_received_deposit_bonus = TRUE WHERE id = $2 RETURNING available_balance`,
          [bonus, dep.user_id]
        );
        await query(
          `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
          ['AC' + Date.now() + 'B1', dep.user_id, 'deposit_bonus', bonus, bonusUserRes.rows[0].available_balance, `4% First Deposit Bonus +$${bonus.toFixed(2)} USDT`]
        ).catch(() => { });

        // --- Bonus to the referrer (if any) ---
        if (depUser?.referred_by) {
          const refBonusRes = await query(
            `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1 WHERE id = $2 RETURNING available_balance`,
            [bonus, depUser.referred_by]
          );
          await query(
            `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
            ['AC' + Date.now() + 'B2', depUser.referred_by, 'referral_bonus', bonus, refBonusRes.rows[0].available_balance, `4% Referral Bonus from referred user's first deposit +$${bonus.toFixed(2)} USDT`]
          ).catch(() => { });
        }

        bonusMessage = ` + 4% First Deposit Bonus ($${bonus.toFixed(2)}) to user & referrer`;
      }
    }

    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['AC' + Date.now(), dep.user_id, 'deposit', amount, userRes.rows[0].available_balance, `Deposit approved: ${dep.order_number} (+${awardedSpins} Lucky Spin Chances)`]
    );
    await query('COMMIT');
    res.json({ message: `Deposit ${dep.order_number} ($${amount}) approved! Granted ${awardedSpins} spin chance(s).${bonusMessage}`, newBalance: parseFloat(userRes.rows[0].available_balance), spinChances: parseInt(userRes.rows[0].spin_chances) });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

router.post('/deposits/reject', requireAdminSecret, async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) return res.status(400).json({ error: 'depositId is required' });
    const depRes = await query(
      `UPDATE deposits SET status = 'failed', audit_status = 'rejected' WHERE id = $1 AND audit_status = 'pending' RETURNING *`,
      [depositId]
    );
    if (!depRes.rows.length) return res.status(400).json({ error: 'Not found or already processed' });
    res.json({ message: `Deposit ${depRes.rows[0].order_number} rejected.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
});

// ----------------------------------------------------
// WITHDRAWALS APPROVE / REJECT
// ----------------------------------------------------
router.post('/withdrawals/approve', requireAdminSecret, async (req, res) => {
  try {
    const { withdrawalId } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });
    const witRes = await query(
      `UPDATE withdrawals SET status = 'completed', audit_status = 'approved' WHERE id = $1 AND audit_status = 'pending' RETURNING *`,
      [withdrawalId]
    );
    if (!witRes.rows.length) return res.status(400).json({ error: 'Not found or already processed' });
    const w = witRes.rows[0];
    res.json({ message: `Withdrawal ${w.order_number} ($${w.amount}) approved!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

router.post('/withdrawals/reject', requireAdminSecret, async (req, res) => {
  try {
    const { withdrawalId, reason } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId is required' });
    await query('BEGIN');
    const witRes = await query(`SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE`, [withdrawalId]);
    if (!witRes.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'Withdrawal not found' }); }
    const w = witRes.rows[0];
    if (w.audit_status !== 'pending') { await query('ROLLBACK'); return res.status(400).json({ error: `Already ${w.audit_status}` }); }
    // Refund the full amount plus the $1 fee that was deducted when the withdrawal was created
    const amount = parseFloat(w.amount);
    const fee = parseFloat(w.fee || 0);
    const refundTotal = amount + fee;
    await query(`UPDATE withdrawals SET status = 'failed', audit_status = 'rejected' WHERE id = $1`, [withdrawalId]);
    const userRes = await query(
      `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1 WHERE id = $2 RETURNING available_balance`,
      [refundTotal, w.user_id]
    );
    await query(
      `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['AC' + Date.now(), w.user_id, 'withdrawal_refund', refundTotal, userRes.rows[0].available_balance, `Withdrawal rejected & refunded (incl. fee): ${reason || 'Audit failed'}`]
    );
    await query('COMMIT');
    res.json({ message: `Withdrawal ${w.order_number} rejected & $${refundTotal.toFixed(2)} (incl. fee) refunded!` });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

// ----------------------------------------------------
// SIGNAL RECONCILIATION — repair double-settled trades
// ----------------------------------------------------
// Detects signal_trades that were settled more than once (due to the earlier
// race condition in processDueSignalTrades) and reverses the duplicate credits.
//
// Two detection strategies are used:
//  A) Trade-ID based: new close records include "trade ST..." in their remark.
//     Group by trade id — if more than one close record references the same
//     trade, the extras are duplicates.
//  B) Legacy amount+time based: older close records (created before the remark
//     fix) don't include a trade id. If two+ signal_close records with the same
//     rounded amount were created within the same 2-minute window (exactly what
//     happened in the triple-close bug), all but the earliest are duplicates.
router.post('/signals/reconcile', requireAdminSecret, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    await query('BEGIN');

    // Lock the user row to serialize reconciliation
    const userLock = await query(`SELECT id, available_balance, total_assets, total_earnings, frozen_balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    if (!userLock.rows.length) { await query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }

    // Find ALL signal_close records for this user (with their timestamps)
    const closeRes = await query(
      `SELECT id, amount, remark, created_at FROM account_changes
       WHERE user_id = $1 AND type = 'signal_close' AND remark NOT LIKE '%[REVERSED]%'
       ORDER BY created_at ASC, id ASC`,
      [userId]
    );

    // Strategy A: group by trade id from remark
    const tradeGroups = {};
    // Strategy B: track records with no trade id for amount+time grouping
    const noIdRecords = [];

    for (const rec of closeRes.rows) {
      const m = rec.remark.match(/trade (ST[^\s]+)/);
      if (m) {
        const tradeId = m[1];
        if (!tradeGroups[tradeId]) tradeGroups[tradeId] = [];
        tradeGroups[tradeId].push(rec);
      } else {
        noIdRecords.push(rec);
      }
    }

    const reversed = [];
    const reverseRecord = async (dup) => {
      const dupAmount = parseFloat(dup.amount);
      // Reverse: subtract the duplicate credit from available_balance ONLY.
      // (The settlement added the FULL return total to available_balance, so that's
      // what must be withdrawn here. total_assets is recomputed from the authoritative
      // ledger below — it only ever received the PROFIT portion per settlement, so
      // subtracting the full return would incorrectly thrash it.)
      await query(
        `UPDATE users
         SET available_balance = GREATEST(0, available_balance - $1)
         WHERE id = $2`,
        [dupAmount, userId]
      );
      // Mark the duplicate close record as reversed
      await query(
        `UPDATE account_changes SET remark = remark || ' [REVERSED]' WHERE id = $1`,
        [dup.id]
      );
      reversed.push({ recordId: dup.id, amount: dupAmount, basis: dup.basis || 'same-trade' });
    };

    // Strategy A: same trade id = duplicates (keep earliest)
    for (const [tradeId, records] of Object.entries(tradeGroups)) {
      if (records.length <= 1) continue;
      records.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id));
      for (const dup of records.slice(1)) {
        dup.basis = `same-trade ${tradeId}`;
        await reverseRecord(dup);
      }
    }

    // Strategy B: legacy records without trade id — group by rounded amount
    // within a 2-minute window (the triple-close bug fired at the same instant).
    const legacyGroups = {};
    for (const rec of noIdRecords) {
      const key = rec.amount.toFixed(2);
      if (!legacyGroups[key]) legacyGroups[key] = [];
      legacyGroups[key].push(rec);
    }
    for (const records of Object.values(legacyGroups)) {
      if (records.length <= 1) continue;
      // Sort chronologically
      records.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id));
      // Keep the first record as the legitimate settlement, but only mark the
      // FOLLOWING records as duplicates if they occurred within 2 minutes.
      for (let i = 1; i < records.length; i++) {
        const prev = records[i - 1];
        const diffMs = new Date(records[i].created_at) - new Date(prev.created_at);
        if (diffMs <= 120000) { // within 2 minutes
          records[i].basis = `same-amount ${records[i].amount.toFixed(2)} (${diffMs}ms apart)`;
          await reverseRecord(records[i]);
        }
      }
    }

    // ---- Recompute total_assets from the authoritative ledger ----
    // total_assets is a cumulative-inflow metric:
    //   deposits (approved) + bonuses/commissions + signal profits (exactly once)
    // The signal_trades table stores ONE row per opened position, so summing its
    // profit column counts each position's profit EXACTLY once — ignoring the
    // multiple settlements that may have credited it to available_balance.
    const assetsLedger = await query(
      `SELECT
         (SELECT COALESCE(SUM(amount),0) FROM deposits
           WHERE user_id = $1 AND status = 'success') AS deposits,
         (SELECT COALESCE(SUM(amount),0) FROM account_changes
           WHERE user_id = $1 AND type IN ('deposit_bonus','referral_bonus','commission')) AS bonuses,
         (SELECT COALESCE(SUM(profit),0) FROM signal_trades
           WHERE user_id = $1 AND status = 'completed') AS profits`,
      [userId]
    );
    const l = assetsLedger.rows[0];
    const correctTotalAssets = parseFloat(l.deposits) + parseFloat(l.bonuses) + parseFloat(l.profits);
    await query(
      `UPDATE users SET total_assets = $1 WHERE id = $2`,
      [correctTotalAssets, userId]
    );

    // Re-fetch the user's corrected balances
    const corrected = await query(
      `SELECT available_balance, total_assets, total_earnings, frozen_balance FROM users WHERE id = $1`,
      [userId]
    );

    await query('COMMIT');

    res.json({
      message: reversed.length
        ? `Reversed ${reversed.length} duplicate signal settlement(s) for user ${userId} and recomputed total_assets: $${correctTotalAssets.toFixed(2)}`
        : `No duplicate settlements found for user ${userId}. Recomputed total_assets: $${correctTotalAssets.toFixed(2)}`,
      reversed,
      user: corrected.rows[0],
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    console.error('Signal reconcile error:', err);
    res.status(500).json({ error: 'Failed to reconcile signal trades' });
  }
});

// ----------------------------------------------------
// VIP & SALARY REWARDS MANAGEMENT
// ----------------------------------------------------
import { VIP_TIERS, getVipLevelInfo, calculate3LevelTeam } from './referrals.js';

// GET /api/admin/vip-rewards — Get all users with VIP tier stats, salary history, and promotion claims
router.get('/vip-rewards', requireAdminSecret, async (req, res) => {
  try {
    const usersRes = await query(
      `SELECT id, name, phone, email, invite_code, available_balance, total_assets, vip_level, last_salary_payout_date, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    const usersWithVip = [];
    for (const u of usersRes.rows) {
      const teamStats = await calculate3LevelTeam(u.id, u.invite_code);
      const vipInfo = getVipLevelInfo(teamStats.directCount, teamStats.total3LevelCount);

      usersWithVip.push({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        inviteCode: u.invite_code,
        availableBalance: parseFloat(u.available_balance || 0),
        totalAssets: parseFloat(u.total_assets || 0),
        vipLevel: vipInfo.level,
        vipName: vipInfo.name,
        directMembers: teamStats.directCount,
        level2Members: teamStats.level2Count,
        level3Members: teamStats.level3Count,
        total3LevelMembers: teamStats.total3LevelCount,
        salary10Days: vipInfo.salary10Days,
        promotionReward: vipInfo.promotionReward,
        lastSalaryDate: u.last_salary_payout_date
      });
    }

    const [salaryLogs, promoClaims] = await Promise.all([
      query(`SELECT s.*, u.name as user_name, u.phone as user_phone FROM salary_payouts s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 50`),
      query(`SELECT c.*, u.name as user_name, u.phone as user_phone FROM vip_promotion_claims c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC LIMIT 50`)
    ]);

    res.json({
      success: true,
      users: usersWithVip,
      salaryPayouts: salaryLogs.rows,
      promotionClaims: promoClaims.rows,
      vipTiers: VIP_TIERS
    });
  } catch (err) {
    console.error('Admin VIP rewards fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch VIP rewards data' });
  }
});

// POST /api/admin/trigger-salary-payout — Execute 10-Day Salary Payouts for eligible VIP users
router.post('/trigger-salary-payout', requireAdminSecret, async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    let whereClause = '';
    let params = [];

    if (targetUserId) {
      whereClause = 'WHERE id = $1';
      params = [targetUserId];
    }

    const usersRes = await query(
      `SELECT id, name, invite_code, available_balance, total_assets, vip_level FROM users ${whereClause}`,
      params
    );

    const payoutResults = [];
    const nowStr = new Date().toISOString().substring(0, 10);
    const periodLabel = `10-Day Salary (${nowStr})`;

    for (const u of usersRes.rows) {
      const teamStats = await calculate3LevelTeam(u.id, u.invite_code);
      const vipInfo = getVipLevelInfo(teamStats.directCount, teamStats.total3LevelCount);

      if (vipInfo.salary10Days > 0) {
        const salaryAmount = vipInfo.salary10Days;
        const payoutId = `SAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Credit user's available balance and total assets
        await query(
          `UPDATE users 
           SET available_balance = available_balance + $1, 
               total_assets = total_assets + $1,
               vip_level = $2,
               last_salary_payout_date = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [salaryAmount, vipInfo.level, u.id]
        );

        // Record salary payout log
        await query(
          `INSERT INTO salary_payouts (id, user_id, vip_level, amount, payout_period, status)
           VALUES ($1, $2, $3, $4, $5, 'completed')`,
          [payoutId, u.id, vipInfo.level, salaryAmount, periodLabel]
        );

        // Record account change log for transparency
        await query(
          `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
           VALUES ($1, $2, 'salary_payout', $3, $4, $5)`,
          [
            `AC_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            u.id,
            salaryAmount,
            parseFloat(u.available_balance || 0) + salaryAmount,
            `10-Day System Salary Payout for ${vipInfo.level}`
          ]
        ).catch(() => { });

        payoutResults.push({
          userId: u.id,
          userName: u.name,
          vipLevel: vipInfo.level,
          amount: salaryAmount,
          status: 'credited'
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully processed 10-day salary distribution for ${payoutResults.length} VIP members.`,
      payouts: payoutResults
    });
  } catch (err) {
    console.error('Trigger salary payout error:', err);
    res.status(500).json({ error: 'Failed to process salary payout' });
  }
});

// POST /api/admin/approve-promotion — Approve or reject VIP promotion claims
router.post('/approve-promotion', requireAdminSecret, async (req, res) => {
  try {
    const { claimId, status, note } = req.body;
    if (!claimId || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid claimId and status (approved/rejected) are required' });
    }

    const claimRes = await query(`SELECT * FROM vip_promotion_claims WHERE id = $1`, [claimId]);
    if (claimRes.rows.length === 0) return res.status(404).json({ error: 'Claim record not found' });

    const claim = claimRes.rows[0];

    if (status === 'approved' && claim.status !== 'approved') {
      // Credit user available balance
      await query(
        `UPDATE users SET available_balance = available_balance + $1, total_assets = total_assets + $1 WHERE id = $2`,
        [claim.reward_amount, claim.user_id]
      );
    }

    await query(
      `UPDATE vip_promotion_claims SET status = $1, note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, note || `Updated by admin to ${status}`, claimId]
    );

    res.json({
      success: true,
      message: `Promotion claim ${claimId} has been ${status}.`
    });
  } catch (err) {
    console.error('Approve promotion error:', err);
    res.status(500).json({ error: 'Failed to update promotion claim' });
  }
});

export default router;
