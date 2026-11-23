import { db } from '../lib/db.js';
import { adminCookie, ipHash, passwordMatches, sameOrigin } from '../lib/admin-auth.js';
import { isMissingTable, setupDatabase } from '../lib/setup-db.js';

const attempts = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid request origin.' });
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return res.status(503).json({ error: 'Admin is not configured.' });
  try {
    const hash = ipHash(req);
    // Rate limit: database-backed when available, otherwise best-effort per server instance.
    const sql = process.env.DATABASE_URL ? db() : null;
    let count, needsSetup = false;
    if (sql) {
      try { count = (await sql`SELECT count(*)::int AS count FROM admin_login_attempts WHERE ip_hash = ${hash} AND created_at > now() - interval '15 minutes'`)[0].count; }
      catch (error) { if (!isMissingTable(error)) throw error; needsSetup = true; count = 0; }
    }
    if (!sql || needsSetup) { const cutoff = Date.now() - 15 * 60 * 1000; attempts.set(hash, (attempts.get(hash) || []).filter(t => t > cutoff)); count = attempts.get(hash).length; }
    if (count >= 5) return res.status(429).json({ error: 'Try again later.' });
    if (!passwordMatches(req.body?.password)) {
      if (sql && !needsSetup) await sql`INSERT INTO admin_login_attempts (ip_hash) VALUES (${hash})`;
      else attempts.get(hash).push(Date.now());
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    // First sign-in on a new database: create all the tables.
    if (needsSetup) await setupDatabase(sql);
    res.setHeader('Set-Cookie', adminCookie());
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  } catch (error) { console.error('Admin login failed:', error.message); return res.status(503).json({ error: 'Admin is unavailable.' }); }
}
