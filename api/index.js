import app from '../server/index.js';

// Increase Vercel function timeout to 60s.
// The default 10s can cause FUNCTION_INVOCATION_FAILED when Neon PostgreSQL
// wakes from idle (cold start) or when DB queries take longer than expected.
export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    return await app(req, res);
  } catch (err) {
    console.error('Vercel Function Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
}

