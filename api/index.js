import app, { dbInitializedPromise } from '../server/index.js';

export default async function handler(req, res) {
  if (dbInitializedPromise) {
    try {
      await dbInitializedPromise;
    } catch (err) {
      console.error('Database connection error in Vercel function:', err);
    }
  }
  return app(req, res);
}
