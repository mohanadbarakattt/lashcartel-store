import Stripe from 'stripe';
import { db } from '../lib/db.js';
import { confirmationEmail } from '../lib/order-emails.js';
import { sendEmail } from '../lib/email.js';
import { creditOrder, reverseOrder, cashEnabled } from '../lib/cash.js';
import { confirmPayment, kitTickets, sendTickets, releasePayment } from '../lib/giveaway.js';

export const config = { api: { bodyParser: false } };
const rawBody = async req => { const chunks = []; for await (const chunk of req) chunks.push(chunk); return Buffer.concat(chunks); };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.DATABASE_URL) return res.status(503).end();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try { event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (_) { return res.status(400).json({ error: 'Invalid webhook signature.' }); }
  const sql = db();
  try {
    if (event.type === 'payment_intent.succeeded' && event.data.object.metadata?.source === 'lash-cartel-giveaway') {
      const intent = event.data.object;
      const result = await confirmPayment(sql, intent);
      if (result) await sendTickets(sql, result, intent.id, 'paid');
    } else if (event.type === 'payment_intent.canceled' && event.data.object.metadata?.source === 'lash-cartel-giveaway') {
      await releasePayment(sql, event.data.object.id);
    } else if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const address = intent.shipping?.address || null;
      const updated = await sql`UPDATE orders SET status = 'paid', shipping_address = ${JSON.stringify(address)}::jsonb
        WHERE payment_intent_id = ${intent.id} AND status = 'pending' RETURNING *`;
      // Cartel Cash: credit points as soon as the order is paid (the success page may already have done it).
      try { await creditOrder(sql, intent); } catch (error) { console.error('Cartel Cash credit failed:', error.message); }
      if (updated.length) {
        const order = updated[0];
        await sql`UPDATE carts SET purchased_at = now() WHERE email = ${order.customer_email} AND purchased_at IS NULL`;
        try {
          const email = confirmationEmail(order);
          const sent = await sendEmail({ to: order.customer_email, ...email });
          await sql`INSERT INTO email_log (kind, reference_id, recipient, status) VALUES ('confirmation', ${String(order.id)}, ${order.customer_email}, ${sent.dryRun ? 'dry-run' : 'sent'}) ON CONFLICT (kind,reference_id) DO UPDATE SET status = EXCLUDED.status, error = null`;
          await sql`UPDATE orders SET confirmation_sent_at = now() WHERE id = ${order.id}`;
        } catch (error) {
          await sql`INSERT INTO email_log (kind, reference_id, recipient, status, error) VALUES ('confirmation', ${String(order.id)}, ${order.customer_email}, 'failed', ${error.message}) ON CONFLICT (kind,reference_id) DO UPDATE SET status = 'failed', error = EXCLUDED.error`;
        }
        // November Giveaway: 1 free ticket per DIY lash kit while tickets are on sale. Never blocks the order.
        try {
          const free = await kitTickets(sql, order, intent);
          if (free) await sendTickets(sql, free, `order:${order.id}`, 'kit');
        } catch (error) { console.error('Giveaway kit ticket failed:', error.message); }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      await sql`UPDATE orders SET status = 'failed' WHERE payment_intent_id = ${event.data.object.id} AND status = 'pending'`;
    } else if (event.type === 'charge.refunded') {
      const intentId = event.data.object.payment_intent;
      if (intentId) {
        await sql`UPDATE giveaway_tickets SET status = 'refunded' WHERE payment_ref = ${intentId} AND status = 'sold'`;
        const refunded = await sql`UPDATE orders SET status = 'refunded' WHERE payment_intent_id = ${intentId} AND status IN ('paid','dispatched') RETURNING *`;
        for (const order of refunded) {
          await sql`UPDATE giveaway_tickets SET status = 'refunded' WHERE payment_ref = ${`order:${order.id}`} AND status = 'sold'`;
          if (cashEnabled()) await reverseOrder(sql, order);
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
}
