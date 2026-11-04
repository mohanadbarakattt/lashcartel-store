// Public: validate a referral code (GET ?code=) or record a link click (POST {code}).
import { findCode, recordClick, normalizeCode } from '../lib/referrals.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Referrals unavailable.' });
  try {
    if (req.method === 'GET') {
      const found = await findCode(req.query?.code);
      if (!found) return res.status(404).json({ valid: false, error: 'That code is not valid.' });
      return res.status(200).json({ valid: true, code: found.code, discountPercent: found.discountPercent });
    }
    if (req.method === 'POST') {
      const code = normalizeCode(req.body?.code);
      if (!code) return res.status(400).json({ ok: false });
      const recorded = await recordClick(code);
      return res.status(recorded ? 200 : 404).json({ ok: !!recorded });
    }
    return res.status(405).end();
  } catch (error) {
    console.error('Referral lookup failed:', error.message);
    return res.status(503).json({ error: 'Referrals unavailable.' });
  }
}
