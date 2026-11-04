// Owner admin: list referral codes with stats (GET), create a code or enable/disable one (POST).
import { isAdmin, sameOrigin } from '../lib/admin-auth.js';
import { listCodes, createCode, setActive, ordersByCode, summarize } from '../lib/referrals.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!isAdmin(req)) return res.status(401).json({ error: 'Sign in required.' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe is not configured.' });
  try {
    if (req.method === 'GET') {
      const [codes, byCode] = await Promise.all([listCodes(), ordersByCode()]);
      return res.status(200).json({ referrals: summarize(codes, byCode) });
    }
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid request origin.' });
      const body = req.body || {};
      if (body.action === 'create') return res.status(200).json({ referral: await createCode(body) });
      if (body.action === 'toggle') return res.status(200).json({ referral: await setActive(body.code, body.active) });
      return res.status(400).json({ error: 'Unknown action.' });
    }
    return res.status(405).end();
  } catch (error) {
    const userError = /Code must|Enter the|already exists|not found/.test(error.message);
    if (!userError) console.error('Admin referrals failed:', error.message);
    return res.status(userError ? 400 : 503).json({ error: userError ? error.message : 'Referral data unavailable.' });
  }
}
