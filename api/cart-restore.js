import { db } from '../lib/db.js';
import { validSignature } from '../lib/links.js';

export default async function handler(req,res) {
  if (req.method !== 'GET') return res.status(405).end();
  const id = Number(req.query?.id);
  if (!Number.isSafeInteger(id) || id < 1 || !validSignature('cart',id,req.query?.sig)) return res.status(403).json({ error:'Invalid cart link.' });
  try {
    const rows = await db()`SELECT items FROM carts WHERE id = ${id} AND unsubscribed_at IS NULL`;
    if (!rows.length) return res.status(404).json({ error:'Cart not found.' });
    res.setHeader('Cache-Control','private, no-store');
    return res.status(200).json({ items:rows[0].items });
  } catch (error) { console.error('Cart restore failed:',error.message); return res.status(503).json({ error:'Could not restore cart.' }); }
}
