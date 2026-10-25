import { db } from '../lib/db.js';
import { memberId } from '../lib/member-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (process.env.CARTEL_CASH_ENABLED !== 'true') return res.status(404).end();
  const id = memberId(req);
  if (!id) return res.status(401).json({ error: 'Sign in to view Cartel Cash.' });
  try {
    const sql = db();
    const [members, history, balanceRows, config] = await Promise.all([
      sql`SELECT email, verified_at FROM members WHERE id = ${id}`,
      sql`SELECT points, reason, created_at FROM points_ledger WHERE member_id = ${id} ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT COALESCE(sum(points),0)::int AS balance FROM points_ledger WHERE member_id = ${id}`,
      sql`SELECT minimum_redemption_points, redemption_step_points, redemption_step_cents, expiry_days FROM reward_config WHERE id = TRUE`,
    ]);
    if (!members.length || !members[0].verified_at) return res.status(401).json({ error: 'Sign in to view Cartel Cash.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ email: members[0].email, balance: balanceRows[0].balance, history, reward: config[0] });
  } catch (error) { console.error('Member data failed:', error.message); return res.status(503).json({ error: 'Account is unavailable.' }); }
}
