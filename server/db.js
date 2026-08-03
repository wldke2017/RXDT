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
    on: () => {}
  };
} else {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });
}

export { pool };
export const query = (text, params) => pool.query(text, params);
export default { pool, query };
