// Owner admin for the November Giveaway. GET: tickets, totals, draw. POST {action:'draw'}: start the live draw.
import { db } from '../lib/db.js';
import { isAdmin, sameOrigin } from '../lib/admin-auth.js';
import { GIVEAWAY, phase, getDraw, startDraw } from '../lib/giveaway.js';

async function overview(sql) {
  const [tickets, draw] = await Promise.all([
    sql`SELECT number, status, source, name, email, phone, payment_ref, paid_at, hold_expires FROM giveaway_tickets
        WHERE status <> 'held' OR hold_expires > now() ORDER BY number`,
    getDraw(sql),
  ]);
  const winners = draw ? draw.winners.map((n, i) => ({ place: GIVEAWAY.prizes[2 - i], ticket: tickets.find(t => t.number === n) || { number: n } })) : [];
  return { giveaway: GIVEAWAY, phase: phase(), tickets, draw, winners };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sign in required.' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'The store database (DATABASE_URL) is not connected.' });
  const sql = db();
  try {
    if (req.method === 'GET') return res.status(200).json(await overview(sql));
    if (req.method === 'POST' && req.body?.action === 'draw') {
      if (!sameOrigin(req)) return res.status(403).json({ error: 'Bad origin.' });
      try { await startDraw(sql); } catch (error) { return res.status(400).json({ error: error.message }); }
      return res.status(200).json(await overview(sql));
    }
    return res.status(405).end();
  } catch (error) {
    console.error('Admin giveaway failed:', error.message);
    return res.status(503).json({ error: 'Giveaway data unavailable.' });
  }
}
