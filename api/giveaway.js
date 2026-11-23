// November Giveaway. GET: public board (taken numbers + draw). POST: hold numbers and start a Stripe payment.
import Stripe from 'stripe';
import { db } from '../lib/db.js';
import { GIVEAWAY, phase, priceCents, cleanNumbers, cleanBuyer, takenNumbers, getDraw, holdNumbers, attachPayment, releaseHold, pad } from '../lib/giveaway.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'The giveaway is not connected yet.' });
  const sql = db();

  if (req.method === 'GET') {
    try {
      const [taken, draw] = await Promise.all([takenNumbers(sql), getDraw(sql)]);
      const { name, total, opensAt, closesAt, announceAt, holdMinutes, maxPerOrder } = GIVEAWAY;
      // Winners stay secret until the reveal starts.
      const started = draw && Date.parse(draw.startsAt) <= Date.now();
      return res.status(200).json({ name, total, opensAt, closesAt, announceAt, holdMinutes, maxPerOrder, phase: phase(), now: new Date().toISOString(), taken,
        draw: draw ? { startsAt: draw.startsAt, winners: started ? draw.winners : null } : null });
    } catch (error) {
      console.error('Giveaway board failed:', error.message);
      return res.status(503).json({ error: 'Could not load tickets.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Payments are not configured.' });
  if (process.env.VERCEL_ENV !== 'production' && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) return res.status(503).json({ error: 'Preview checkout requires Stripe test keys.' });
  if (phase() !== 'open') return res.status(400).json({ error: phase() === 'before' ? 'Tickets are not on sale yet.' : 'Tickets are closed.' });

  let numbers, buyer;
  try { numbers = cleanNumbers(req.body?.numbers); buyer = cleanBuyer(req.body); }
  catch (error) { return res.status(400).json({ error: error.message }); }

  let holdId;
  try {
    // A buyer changing their numbers mid-checkout releases their own previous hold first.
    if (typeof req.body?.previousHold === 'string' && /^[0-9a-f-]{36}$/.test(req.body.previousHold)) await releaseHold(sql, req.body.previousHold);
    const hold = await holdNumbers(sql, numbers, buyer);
    if (hold.taken) return res.status(409).json({ error: `Sorry, ${hold.taken.map(pad).join(', ')} ${hold.taken.length > 1 ? 'were' : 'was'} just taken. Pick another number.`, taken: hold.taken });
    holdId = hold.holdId;
    const amount = priceCents(numbers.length);
    const list = numbers.map(pad).join(',');
    const intent = await new Stripe(process.env.STRIPE_SECRET_KEY).paymentIntents.create({
      amount,
      currency: 'aud',
      payment_method_types: ['card'],
      receipt_email: buyer.email,
      description: `Lash Cartel ${GIVEAWAY.name} tickets: ${list}`,
      metadata: { source: 'lash-cartel-giveaway', numbers: list, hold_id: holdId, buyer_name: buyer.name.slice(0, 450), buyer_phone: buyer.phone },
    });
    await attachPayment(sql, holdId, intent.id);
    return res.status(200).json({ clientSecret: intent.client_secret, holdId, amount, numbers, holdMinutes: GIVEAWAY.holdMinutes });
  } catch (error) {
    console.error('Giveaway checkout failed:', error.message);
    if (holdId) await releaseHold(sql, holdId).catch(() => {});
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}
