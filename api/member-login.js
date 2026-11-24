// Cartel Cash sign-in without email: the order email plus any paid order number from that email.
import { db } from '../lib/db.js';
import { ipHash, sameOrigin } from '../lib/admin-auth.js';
import { memberCookie } from '../lib/member-auth.js';
import { cashEnabled, memberForEmail } from '../lib/cash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!cashEnabled()) return res.status(404).end();
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid request origin.' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Cartel Cash is not configured.' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const orderNumber = String(req.body?.orderNumber || '').trim().toUpperCase().replace(/^#/, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250 || !/^LC-[A-Z0-9]{3,12}$/.test(orderNumber)) {
    return res.status(400).json({ error: 'Enter your email and order number (it starts with LC-).' });
  }
  try {
    const sql = db();
    const key = `member:${ipHash(req)}`;
    const recent = await sql`SELECT count(*)::int AS count FROM admin_login_attempts WHERE ip_hash = ${key} AND created_at > now() - interval '15 minutes'`;
    if (recent[0].count >= 8) return res.status(429).json({ error: 'Too many tries. Please wait 15 minutes.' });
    const orders = await sql`SELECT id FROM orders WHERE customer_email = ${email} AND order_number = ${orderNumber} AND status IN ('paid','dispatched') LIMIT 1`;
    if (!orders.length) {
      await sql`INSERT INTO admin_login_attempts (ip_hash) VALUES (${key})`;
      return res.status(401).json({ error: 'We could not find a paid order with that email and order number.' });
    }
    res.setHeader('Set-Cookie', memberCookie(await memberForEmail(sql, email)));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Cartel Cash sign-in failed:', error.message);
    return res.status(503).json({ error: 'Sign-in is unavailable right now.' });
  }
}
