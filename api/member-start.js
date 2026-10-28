import { randomBytes, createHash } from 'node:crypto';
import { db } from '../lib/db.js';
import { sendEmail, escapeHtml } from '../lib/email.js';
import { siteUrl } from '../lib/links.js';
import { sameOrigin } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!sameOrigin(req)) return res.status(403).end();
  if (process.env.CARTEL_CASH_ENABLED !== 'true') return res.status(404).end();
  if (!process.env.DATABASE_URL || !process.env.MEMBER_SESSION_SECRET) return res.status(503).json({ error: 'Cartel Cash is not configured.' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const marketingConsent = req.body?.marketingConsent === true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    const sql = db();
    const member = await sql`INSERT INTO members(email, marketing_consent) VALUES (${email}, ${marketingConsent})
      ON CONFLICT(email) DO UPDATE SET marketing_consent = members.marketing_consent OR EXCLUDED.marketing_consent RETURNING id`;
    const recent = await sql`SELECT count(*)::int AS count FROM member_magic_links WHERE member_id = ${member[0].id} AND created_at > now() - interval '1 hour'`;
    if (recent[0].count >= 3) return res.status(429).json({ error: 'Please check your inbox or try again later.' });
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await sql`INSERT INTO member_magic_links(token_hash, member_id, expires_at) VALUES (${tokenHash}, ${member[0].id}, now() + interval '15 minutes')`;
    const link = siteUrl(`/account.html?token=${token}`);
    await sendEmail({ to: email, subject: 'Your Lash Cartel sign-in link', html: `<p>Hey Baddie,</p><p>Use this link within 15 minutes to sign in to Cartel Cash:</p><p><a href="${escapeHtml(link)}">Sign in to Cartel Cash</a></p><p>With love, Lash Cartel 💋</p>`, text: `Use this link within 15 minutes to sign in to Cartel Cash: ${link}\nWith love, Lash Cartel 💋` });
    return res.status(200).json({ ok: true, message: 'Check your inbox for a sign-in link. It expires in 15 minutes.' });
  } catch (error) { console.error('Member sign-in failed:', error.message); return res.status(503).json({ error: 'Sign-in is unavailable.' }); }
}
