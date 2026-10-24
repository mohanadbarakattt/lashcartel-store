import Stripe from 'stripe';
import { quote, GIFT_OPTIONS } from '../lib/catalog.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Vercel environment variables.'
    });
  }
  if (process.env.VERCEL_ENV !== 'production' && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    return res.status(503).json({ error: 'Preview checkout requires Stripe test keys.' });
  }

  try {
    const { items, customerEmail, freeGift } = req.body || {};

    let pricing;
    try { pricing = quote(items); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const { subtotal: subtotalCents, discount: discountCents, shipping: shippingCents, total: totalCents } = pricing;
    const summary = pricing.lines.map(line => `${line.name} x${line.quantity}`);

    const gift = GIFT_OPTIONS.includes(freeGift) ? freeGift : GIFT_OPTIONS[0];

    const orderNumber = 'LC-' + Date.now().toString(36).toUpperCase().slice(-5) +
      Math.random().toString(36).toUpperCase().slice(2, 5);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'aud',
      payment_method_types: ['card'],
      receipt_email: customerEmail || undefined,
      description: `Lash Cartel order ${orderNumber}: ${summary.join(', ')} + free gift: ${gift}`,
      metadata: {
        source: 'lash-cartel-site',
        order_number: orderNumber,
        items: summary.join(' | '),
        shipping: '$4.95 flat',
        discount: discountCents > 0 ? `10% buy-2+ (-$${(discountCents / 100).toFixed(2)})` : 'none',
        free_gift: gift,
        order_items: JSON.stringify(pricing.lines).slice(0, 500),
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalCents,
      subtotal: subtotalCents,
      discount: discountCents,
      shipping: shippingCents,
      currency: 'aud',
    });
  } catch (err) {
    console.error('PaymentIntent error:', err);
    return res.status(500).json({ error: err.message || 'Could not create payment intent.' });
  }
}
