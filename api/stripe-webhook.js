import Stripe from 'stripe';
import { db } from '../lib/db.js';
import { confirmationEmail } from '../lib/order-emails.js';
import { sendEmail } from '../lib/email.js';

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
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const address = intent.shipping?.address || null;
      const updated = await sql`UPDATE orders SET status = 'paid', shipping_address = ${JSON.stringify(address)}::jsonb
        WHERE payment_intent_id = ${intent.id} AND status = 'pending' RETURNING *`;
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
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      await sql`UPDATE orders SET status = 'failed' WHERE payment_intent_id = ${event.data.object.id} AND status = 'pending'`;
    } else if (event.type === 'charge.refunded') {
      const intentId = event.data.object.payment_intent;
      if (intentId) {
        const refunded = await sql`UPDATE orders SET status = 'refunded' WHERE payment_intent_id = ${intentId} AND status IN ('paid','dispatched') RETURNING *`;
        for (const order of refunded) {
          if (process.env.CARTEL_CASH_ENABLED !== 'true') continue;
          const earn = await sql`SELECT member_id,points FROM points_ledger WHERE event_key = ${`order:${order.id}:earn`}`;
          if (earn.length) await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) VALUES (${earn[0].member_id},${-earn[0].points},${`Refund ${order.order_number}`},${`order:${order.id}:refund`}) ON CONFLICT(event_key) DO NOTHING`;
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
}
