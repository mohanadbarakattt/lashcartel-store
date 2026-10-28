import { db } from '../lib/db.js';
import { adminCookie, ipHash, passwordMatches, sameOrigin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid request origin.' });
  if (!process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return res.status(503).json({ error: 'Admin is not configured.' });
  try {
    const sql = db();
    const hash = ipHash(req);
    const recent = await sql`SELECT count(*)::int AS count FROM admin_login_attempts WHERE ip_hash = ${hash} AND created_at > now() - interval '15 minutes'`;
    if (recent[0].count >= 5) return res.status(429).json({ error: 'Try again later.' });
    if (!passwordMatches(req.body?.password)) {
      await sql`INSERT INTO admin_login_attempts (ip_hash) VALUES (${hash})`;
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    res.setHeader('Set-Cookie', adminCookie());
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  } catch (error) { console.error('Admin login failed:', error.message); return res.status(503).json({ error: 'Admin is unavailable.' }); }
}
