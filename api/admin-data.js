import { db } from '../lib/db.js';
import { isAdmin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sign in required.' });
  try {
    const sql = db();
    const [stock, enquiries, orders] = await Promise.all([
      sql`SELECT product_key, in_stock, updated_at FROM stock_status ORDER BY product_key`,
      sql`SELECT id, kind, name, business, email, phone, location, rental_period, intended_placement, message, email_status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT id, order_number, customer_email, status, total_cents, tracking_number, created_at FROM orders ORDER BY created_at DESC LIMIT 100`,
    ]);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ stock, enquiries, orders });
  } catch (error) { console.error('Admin data failed:', error.message); return res.status(503).json({ error: 'Admin data unavailable.' }); }
}
