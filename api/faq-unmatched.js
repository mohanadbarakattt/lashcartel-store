import { db } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.DATABASE_URL) return res.status(204).end();
  try {
    const sql = db();
    await sql`INSERT INTO faq_unmatched (day, count) VALUES (CURRENT_DATE, 1)
      ON CONFLICT (day) DO UPDATE SET count = faq_unmatched.count + 1`;
  } catch (error) { console.error('FAQ count failed:', error.message); }
  res.status(204).end();
}
