import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool;

if (!connectionString) {
  console.error('⚠️ DATABASE_URL environment variable is missing!');
  // Return a dummy pool that throws a clear JSON-safe error on query
  pool = {
    query: () => Promise.reject(new Error('Database not configured. Please set DATABASE_URL in Vercel environment variables.')),
    connect: async () => {
      throw new Error('Database not configured. Please set DATABASE_URL in Vercel environment variables.');
    },
    on: () => { }
  };
} else {
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: isVercel ? 2 : 10,
    idleTimeoutMillis: isVercel ? 10000 : 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });
}

/**
 * Run a callback inside a REAL database transaction.
 *
 * IMPORTANT: The default `query()` helper uses `pool.query()`, which lets the
 * pool pick a RANDOM connection per statement. That means a raw
 * `query('BEGIN') → query(...) → query('COMMIT')` sequence would execute each
 * statement on a DIFFERENT connection — the BEGIN/COMMIT would be ignored and
 * each individual statement would auto-commit independently. This has caused
 * partial/frozen updates across the codebase (e.g. funds moved to frozen but
 * the signal_trade insert failed).
 *
 * `withTransaction` checks out ONE client via pool.connect(), uses it for every
 * statement inside the callback, then commits (or rolls back) on that same
 * connection. Use the provided `txQuery(text, params)` wrapper for all queries.
 *
 * @param {function} callback - async (txQuery) => result
 * @returns {Promise<*>} result returned from callback
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
export const query = (text, params) => pool.query(text, params);
export default { pool, query, withTransaction };