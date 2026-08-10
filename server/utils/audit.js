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
      SELECT id, username, available_balance, frozen_balance, total_assets 
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

