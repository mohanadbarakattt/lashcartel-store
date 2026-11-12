// Owner admin: raffle entrants from paid Stripe orders. GET ?format=csv downloads a CSV.
import { isAdmin } from '../lib/admin-auth.js';
import { RAFFLE, listEntrants, toCsv } from '../lib/raffle.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sign in required.' });
  try {
    const entrants = await listEntrants();
    if (req.query?.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="raffle-entrants-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.status(200).send(toCsv(entrants));
    }
    return res.status(200).json({ raffle: RAFFLE, entrants });
  } catch (error) {
    console.error('Raffle entrants failed:', error.message);
    return res.status(503).json({ error: 'Raffle entrants unavailable.' });
  }
}
