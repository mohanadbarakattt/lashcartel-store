import { db } from '../lib/db.js';
import { validSignature } from '../lib/links.js';

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { type, sig } = req.body || {};
  const id = Number(req.body?.id);
  if (!Number.isSafeInteger(id) || id < 1 || !validSignature(type, id, sig)) return res.status(403).json({ error:'Invalid unsubscribe link.' });
  try {
    const sql = db();
    if (type === 'stock') await sql`UPDATE stock_subscriptions SET unsubscribed_at = now() WHERE id = ${id}`;
    else if (type === 'cart') await sql`UPDATE carts SET unsubscribed_at = now() WHERE id = ${id}`;
    else return res.status(400).json({ error:'Invalid unsubscribe type.' });
    return res.status(200).json({ ok:true });
  } catch (error) { console.error('Unsubscribe failed:',error.message); return res.status(503).json({ error:'Could not unsubscribe.' }); }
}
