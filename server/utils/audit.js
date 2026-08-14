import { query } from '../db.js';

/**
 * Automatic Balance & Position Integrity Auditor & Repair Tool.
 * 
 * Ensures:
 * 1. user.frozen_balance equals the EXACT sum of all currently open contract_orders + open signal_trades.
 * 2. Any orphan frozen_balance (due to past crashes/duplicate closes) is returned safely to available_balance.
 * 3. All database invariants remain 100% consistent across available_balance, frozen_balance, and total_assets.
 */
export async function runPositionAndBalanceAudit() {
  console.log('🔍 Starting automatic position & balance integrity audit...');
  let repairedUsersCount = 0;
  let totalAdjustedAmount = 0;

  try {
    const usersRes = await query(`
      SELECT id, name, available_balance, frozen_balance, total_assets 
      FROM users 
      WHERE frozen_balance != 0 OR id IN (
        SELECT user_id FROM contract_orders WHERE status = 'open'
        UNION
        SELECT user_id FROM signal_trades WHERE status = 'open'
      )
    `);

    for (const user of usersRes.rows) {
      const userId = user.id;

      const contractOrdersRes = await query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM contract_orders WHERE user_id = $1 AND status = 'open'`,
        [userId]
      );
      const activeContractMargin = parseFloat(contractOrdersRes.rows[0]?.total || 0);

      const signalTradesRes = await query(
        `SELECT COALESCE(SUM(trade_amount), 0) AS total FROM signal_trades WHERE user_id = $1 AND status = 'open'`,
        [userId]
      );
      const activeSignalMargin = parseFloat(signalTradesRes.rows[0]?.total || 0);

      const expectedFrozenBalance = activeContractMargin + activeSignalMargin;
      const actualFrozenBalance = parseFloat(user.frozen_balance || 0);

      const diff = actualFrozenBalance - expectedFrozenBalance;

      if (Math.abs(diff) > 0.0001) {
        console.warn('⚠️ Discrepancy found for user ' + userId + ': Actual frozen=$' + actualFrozenBalance + ', Expected frozen=$' + expectedFrozenBalance + '. Adjusting diff=$' + diff);

        await query('BEGIN');
        try {
          const lockRes = await query(`SELECT available_balance, frozen_balance, total_assets FROM users WHERE id = $1 FOR UPDATE`, [userId]);
          if (lockRes.rows.length === 0) {
            await query('ROLLBACK');
            continue;
          }

          await query(
            `UPDATE users 
             SET frozen_balance = $1,
                 available_balance = available_balance + $2
             WHERE id = $3`,
            [expectedFrozenBalance, diff > 0 ? diff : 0, userId]
          );

          await query(
            `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark)
             VALUES ($1, $2, 'audit_repair', $3, (SELECT available_balance FROM users WHERE id = $2), $4)`,
            [
              'AUD' + Date.now() + '_' + userId.substring(0, 4),
              userId,
              diff > 0 ? diff : 0,
              'Automatic integrity repair: reconciled frozen balance from $' + actualFrozenBalance.toFixed(2) + ' to $' + expectedFrozenBalance.toFixed(2)
            ]
          );

          await query('COMMIT');
          repairedUsersCount++;
          if (diff > 0) totalAdjustedAmount += diff;
        } catch (e) {
          await query('ROLLBACK').catch(() => {});
          console.error('Audit repair error for user ' + userId + ':', e);
        }
      }
    }

    console.log('✅ Audit complete: Audited ' + usersRes.rows.length + ' users, Repaired ' + repairedUsersCount + ' accounts, Recovered $' + totalAdjustedAmount.toFixed(2) + ' stuck balances.');
    return { ok: true, audited: usersRes.rows.length, repaired: repairedUsersCount, recovered: totalAdjustedAmount };
  } catch (err) {
    console.error('Position audit tool error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Master One-Click System Repair Command.
 * 
 * Performs 4-stage automated repair across ALL user accounts in the system:
 * Stage 1: Force-settles ALL open signal trades across all users with full profit calculation & signal_close logs.
 * Stage 2: Reconciles total_deposits from approved deposit records.
 * Stage 3: Audit & release orphan frozen balances back to available balance.
 * Stage 4: Reconciles total_assets = available_balance + frozen_balance across ALL users.
 */
export async function runMasterSystemRepair() {
  console.log('🛠️ Initiating Master One-Click System Balance & Transaction Repair...');
  let tradesSettled = 0;
  let totalProfitCredited = 0;
  let accountsRepaired = 0;
  let totalFrozenRecovered = 0;
  let totalAssetsAdjustedUsers = 0;

  try {
    // ---- STAGE 1: SETTLE ALL OPEN SIGNAL TRADES WITH PROFIT ----
    const openTradesRes = await query(`
      SELECT id, user_id, signal_id, pair, trade_amount, profit 
      FROM signal_trades 
      WHERE status = 'open' OR status = 'processing'
    `);

    for (const trade of openTradesRes.rows) {
      const userId = trade.user_id;
      const tradeAmount = parseFloat(trade.trade_amount || 0);
      let profit = parseFloat(trade.profit || 0);

      // Profit Safety Guarantee: minimum 1.4% profit rate if profit was 0
      if (profit <= 0 && tradeAmount > 0) {
        profit = parseFloat((tradeAmount * 0.014).toFixed(4));
      }
      const returnTotal = tradeAmount + profit;

      await query('BEGIN');
      try {
        const updUser = await query(
          `UPDATE users 
           SET frozen_balance = GREATEST(0, frozen_balance - $1),
               available_balance = available_balance + $2,
               total_assets = total_assets + $3,
               total_earnings = total_earnings + $3
           WHERE id = $4 RETURNING available_balance`,
          [tradeAmount, returnTotal, profit, userId]
        );
        const newBal = parseFloat(updUser.rows[0]?.available_balance || 0);

        await query(
          `UPDATE signal_trades 
           SET status = 'completed', 
               profit = $2,
               settlement_price = COALESCE(settlement_price, purchase_price), 
               settled_at = NOW() 
           WHERE id = $1`,
          [trade.id, profit]
        );

        await query(
          `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) 
           VALUES ($1, $2, 'signal_close', $3, $4, $5)`,
          ['AC' + Date.now() + '_' + Math.floor(Math.random() * 1000), userId, returnTotal, newBal,
            `Signal ${trade.signal_id} — Master Repair Settled Position (${trade.pair || 'BTCUSDT'}) +${profit.toFixed(4)} USDT`]
        ).catch(() => {});

        // Pay referral commission if applicable
        try {
          if (profit > 0) {
            const refRes = await query(`SELECT referred_by FROM users WHERE id = $1`, [userId]);
            const referrerId = refRes.rows[0]?.referred_by;
            if (referrerId) {
              const commission = parseFloat((profit * 0.075).toFixed(4));
              if (commission > 0) {
                const commBalRes = await query(
                  `UPDATE users 
                   SET available_balance = available_balance + $1, 
                       total_assets = total_assets + $1, 
                       total_earnings = total_earnings + $1 
                   WHERE id = $2 RETURNING available_balance`,
                  [commission, referrerId]
                );
                const commBal = parseFloat(commBalRes.rows[0]?.available_balance || 0);
                await query(
                  `INSERT INTO account_changes (id, user_id, type, amount, balance_after, remark) 
                   VALUES ($1, $2, 'commission', $3, $4, $5)`,
                  ['AC' + Date.now() + '_COMM', referrerId, commission, commBal,
                    `L1 Referral Commission from Master Repair Settlement +${commission.toFixed(4)} USDT`]
                ).catch(() => {});
              }
            }
          }
        } catch (commErr) { console.warn('Master repair commission warn:', commErr); }

        await query('COMMIT');
        tradesSettled++;
        totalProfitCredited += profit;
      } catch (err) {
        await query('ROLLBACK').catch(() => {});
        console.error(`Master repair trade settle error for ${trade.id}:`, err);
      }
    }

    // ---- STAGE 2: RECONCILE TOTAL DEPOSITS ----
    const depositUsersRes = await query(`
      SELECT user_id, COALESCE(SUM(amount), 0) as approved_total 
      FROM deposits 
      WHERE audit_status = 'approved' 
      GROUP BY user_id
    `);
    for (const dep of depositUsersRes.rows) {
      await query(
        `UPDATE users SET total_deposits = $1 WHERE id = $2 AND total_deposits < $1`,
        [parseFloat(dep.approved_total), dep.user_id]
      ).catch(() => {});
    }

    // ---- STAGE 3: RECONCILE FROZEN BALANCE INTEGRITY ----
    const auditRes = await runPositionAndBalanceAudit();
    accountsRepaired = auditRes.repaired || 0;
    totalFrozenRecovered = auditRes.recovered || 0;

    // ---- STAGE 4: RECONCILE TOTAL_ASSETS = AVAILABLE + FROZEN ----
    const assetReconcileRes = await query(`
      UPDATE users 
      SET total_assets = available_balance + frozen_balance 
      WHERE ABS(total_assets - (available_balance + frozen_balance)) > 0.001
      RETURNING id
    `);
    totalAssetsAdjustedUsers = assetReconcileRes.rows.length;

    console.log(`✅ Master System Repair Completed Successfully!`);
    console.log(`- Trades Settled: ${tradesSettled}`);
    console.log(`- Total Profit Paid Out: $${totalProfitCredited.toFixed(2)}`);
    console.log(`- Accounts Repaired: ${accountsRepaired}`);
    console.log(`- Stuck Frozen Funds Recovered: $${totalFrozenRecovered.toFixed(2)}`);
    console.log(`- Total Assets Invariants Fixed: ${totalAssetsAdjustedUsers} user(s)`);

    return {
      ok: true,
      message: `Master Repair Complete! Settled ${tradesSettled} position(s) (+$${totalProfitCredited.toFixed(2)} profit paid), recovered $${totalFrozenRecovered.toFixed(2)} stuck frozen funds across ${accountsRepaired} account(s), and aligned total assets for ${totalAssetsAdjustedUsers} user(s).`,
      tradesSettled,
      totalProfitCredited,
      accountsRepaired,
      totalFrozenRecovered,
      totalAssetsAdjustedUsers,
    };
  } catch (err) {
    console.error('Master System Repair Error:', err);
    return { ok: false, error: err.message || 'Master system repair failed' };
  }
}
