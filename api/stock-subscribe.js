import { db } from '../lib/db.js';
import { CATALOG } from '../lib/catalog.js';
import { getStock } from '../lib/stock.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const product = CATALOG[req.body?.product];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250 || !product) {
    return res.status(400).json({ error: 'Enter a valid email and product.' });
  }
  if (!process.env.DATABASE_URL || process.env.RESTOCK_ALERTS_ENABLED !== 'true') return res.status(503).json({ error: 'Restock alerts are not configured.' });
  try {
    const stock = await getStock();
    if (stock[product.stockKey]) return res.status(400).json({ error: 'This product is in stock.' });
    const sql = db();
    await sql`INSERT INTO stock_subscriptions (product_key,email)
      VALUES (${product.stockKey},${email})
      ON CONFLICT (product_key,email) DO UPDATE SET notified_at = null, unsubscribed_at = null`;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Stock subscription failed:', error.message);
    return res.status(500).json({ error: 'Could not subscribe.' });
  }
}
