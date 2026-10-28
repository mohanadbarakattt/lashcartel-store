import { createHash } from 'node:crypto';
import { db } from '../lib/db.js';
import { memberCookie } from '../lib/member-auth.js';
import { sendEmail } from '../lib/email.js';
import { siteUrl } from '../lib/links.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (process.env.CARTEL_CASH_ENABLED !== 'true') return res.status(404).end();
  const token = req.body?.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Invalid sign-in link.' });
  try {
    const sql = db();
    const hash = createHash('sha256').update(token).digest('hex');
    const used = await sql`UPDATE member_magic_links SET consumed_at = now() WHERE token_hash = ${hash} AND consumed_at IS NULL AND expires_at > now() RETURNING member_id`;
    if (!used.length) return res.status(400).json({ error: 'This sign-in link has expired or was already used.' });
    const id = used[0].member_id;
    const first = await sql`UPDATE members SET verified_at = now() WHERE id = ${id} AND verified_at IS NULL RETURNING email`;
    if (first.length) {
      await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) SELECT ${id},join_points,'Welcome to Cartel Cash',${`join:${id}`} FROM reward_config WHERE id = TRUE ON CONFLICT(event_key) DO NOTHING`;
      const url = siteUrl('/account.html');
      try {
        await sendEmail({ to: first[0].email, subject: 'You’re officially in the Cartel, Baddie 💋', html: `<p>Hey Baddie,</p><p>Welcome to the Cartel. You’re officially part of the Lash Cartel community, where beautiful lashes meet exclusive rewards.</p><p>And because we love a good entrance... You’ve just earned 10 Cartel Cash points!</p><p>Earn 1 point per $1 spent, 5 points for a star rating, 5 points for a written review and 5 points when you upload a lash photo to be featured on our website.</p><p>100 points = $5 off an eligible purchase.</p><p><a href="${url}">VIEW MY CARTEL CASH</a></p><p>With love, Lash Cartel 💋</p>`, text: `Hey Baddie,\nWelcome to the Cartel. You’ve just earned 10 Cartel Cash points!\nView your account: ${url}\nWith love, Lash Cartel 💋` });
      } catch (error) { console.error('Welcome email failed:', error.message); }
    }
    res.setHeader('Set-Cookie', memberCookie(id));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  } catch (error) { console.error('Member verification failed:', error.message); return res.status(503).json({ error: 'Could not verify sign-in.' }); }
}
