import { db } from '../lib/db.js';
import { validSignature } from '../lib/links.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const id = Number(req.query?.id);
  if (!Number.isSafeInteger(id) || id < 1 || !validSignature('order', id, req.query?.sig)) return res.status(403).json({ error: 'Invalid order link.' });
  try {
    const rows = await db()`SELECT order_number, items, subtotal_cents, discount_cents, shipping_cents, total_cents, shipping_address, status, tracking_number, created_at FROM orders WHERE id = ${id}`;
    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(rows[0]);
  } catch (error) { console.error('Order details failed:', error.message); return res.status(503).json({ error: 'Order details are unavailable.' }); }
}
