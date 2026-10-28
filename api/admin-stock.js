import { db } from '../lib/db.js';
import { isAdmin, sameOrigin } from '../lib/admin-auth.js';

const keys = new Set(['diy-volume','diy-natural','pretty-ambition','mascara']);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req) || !sameOrigin(req)) return res.status(403).json({ error: 'Not authorized.' });
  const key = req.body?.key;
  const inStock = req.body?.inStock;
  if (!keys.has(key) || typeof inStock !== 'boolean') return res.status(400).json({ error: 'Invalid stock update.' });
  try {
    await db()`INSERT INTO stock_status (product_key,in_stock,updated_at) VALUES (${key},${inStock},now()) ON CONFLICT (product_key) DO UPDATE SET in_stock = EXCLUDED.in_stock, updated_at = now()`;
    return res.status(200).json({ ok: true });
  } catch (error) { console.error('Stock update failed:', error.message); return res.status(503).json({ error: 'Could not update stock.' }); }
}
