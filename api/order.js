import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export default async function handler(req, res) {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured.' });
  }

  const paymentIntentId = (req.query && req.query.payment_intent) || '';
  if (!paymentIntentId || typeof paymentIntentId !== 'string' || paymentIntentId.indexOf('pi_') !== 0) {
    return res.status(400).json({ error: 'Missing or invalid payment_intent.' });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return res.status(200).json({
      orderNumber: pi.metadata && pi.metadata.order_number ? pi.metadata.order_number : null,
      status: pi.status,
      amount: pi.amount,
      currency: pi.currency,
      items: pi.metadata && pi.metadata.items ? pi.metadata.items : '',
    });
  } catch (err) {
    console.error('Order lookup error:', err);
    return res.status(500).json({ error: err.message || 'Could not retrieve order.' });
  }
}
