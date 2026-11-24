// Success page: proves the buyer owns the payment (Stripe client secret), credits Cartel Cash and signs them in on this device.
import Stripe from 'stripe';
import { db } from '../lib/db.js';
import { memberCookie } from '../lib/member-auth.js';
import { cashEnabled, creditOrder } from '../lib/cash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  if (!cashEnabled()) return res.status(404).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.DATABASE_URL) return res.status(503).json({ error: 'Cartel Cash is not configured.' });
  const { paymentIntent, clientSecret } = req.body || {};
  if (typeof paymentIntent !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(paymentIntent) || typeof clientSecret !== 'string' || !clientSecret.startsWith(`${paymentIntent}_secret_`)) {
    return res.status(400).json({ error: 'Invalid payment.' });
  }
  try {
    const intent = await new Stripe(process.env.STRIPE_SECRET_KEY).paymentIntents.retrieve(paymentIntent);
    if (intent.client_secret !== clientSecret) return res.status(403).json({ error: 'Invalid payment.' });
    if (intent.status !== 'succeeded') return res.status(409).json({ error: 'Payment is not complete yet.' });
    const result = await creditOrder(db(), intent);
    if (!result) return res.status(404).json({ error: 'No Cartel Cash for this payment.' });
    res.setHeader('Set-Cookie', memberCookie(result.memberId));
    return res.status(200).json({ earned: result.earned, used: result.used, balance: result.balance, orderNumber: result.orderNumber });
  } catch (error) {
    console.error('Cartel Cash claim failed:', error.message);
    return res.status(503).json({ error: 'Cartel Cash is unavailable right now.' });
  }
}
