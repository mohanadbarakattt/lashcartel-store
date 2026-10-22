import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const CATALOGUE = {
  'DIY Cluster Lash Kit — Volume': 40.00,
  'DIY Cluster Lash Kit — Natural': 40.00,
  'DIY Cluster Lash Kit': 40.00, // legacy name from pre-split carts
  'Pretty Ambition': 40.00,
  'Ultra Fine Precision Mascara': 21.00,
};

const BULK_DISCOUNT_RATE = 0.10;
const BULK_DISCOUNT_MIN_QTY = 2;
const SHIPPING_FLAT_CENTS = 495;
const SOLD_OUT = ['Pretty Ambition'];
const GIFT_OPTIONS = ['Tea Tree Mint Foot Mask', 'Coconut Repair Foot Mask'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Vercel environment variables.'
    });
  }

  try {
    const { items, customerEmail, freeGift } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    let subtotalCents = 0;
    let totalQty = 0;
    const summary = [];

    for (const item of items) {
      if (SOLD_OUT.includes(item.name)) {
        return res.status(400).json({ error: `${item.name} is sold out.` });
      }
      const expected = CATALOGUE[item.name];
      if (expected === undefined) {
        return res.status(400).json({ error: `Unknown product: ${item.name}` });
      }
      const qty = Number(item.quantity) || 1;
      if (qty < 1 || qty > 50) {
        return res.status(400).json({ error: `Invalid quantity for ${item.name}` });
      }
      subtotalCents += Math.round(expected * 100) * qty;
      totalQty += qty;
      summary.push(`${item.name} x${qty}`);
    }

    const discountCents = totalQty >= BULK_DISCOUNT_MIN_QTY
      ? Math.round(subtotalCents * BULK_DISCOUNT_RATE)
      : 0;
    const shippingCents = SHIPPING_FLAT_CENTS;
    const totalCents = subtotalCents - discountCents + shippingCents;

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
