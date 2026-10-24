import Stripe from 'stripe';
import { quote, GIFT_OPTIONS } from '../lib/catalog.js';
import { getStock } from '../lib/stock.js';
import { db } from '../lib/db.js';

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
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Preview orders require a configured database.' });

  try {
    const { items, customerEmail, freeGift } = req.body || {};
    if (typeof customerEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 250) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    let pricing;
    try { pricing = quote(items, await getStock()); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const { subtotal: subtotalCents, discount: discountCents, shipping: shippingCents, total: totalCents } = pricing;
    const summary = pricing.lines.map(line => `${line.name} x${line.quantity}`);

    const gift = GIFT_OPTIONS.includes(freeGift) ? freeGift : GIFT_OPTIONS[0];

    const sql = db();
    const saved = await sql`INSERT INTO orders (customer_email,items,subtotal_cents,discount_cents,shipping_cents,total_cents,free_gift)
      VALUES (${customerEmail.toLowerCase()},${JSON.stringify(pricing.lines)}::jsonb,${subtotalCents},${discountCents},${shippingCents},${totalCents},${gift}) RETURNING id`;
    const orderId = saved[0].id;
    const orderNumber = `LC-${String(10000 + Number(orderId)).padStart(5, '0')}`;

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
        order_id: String(orderId),
      },
    });
    await sql`UPDATE orders SET order_number = ${orderNumber}, payment_intent_id = ${paymentIntent.id} WHERE id = ${orderId}`;

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
