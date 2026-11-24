import { db } from '../lib/db.js';
import { isAdmin, sameOrigin } from '../lib/admin-auth.js';
import { trackingEmail } from '../lib/order-emails.js';
import { sendEmail } from '../lib/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req) || !sameOrigin(req)) return res.status(403).json({ error: 'Not authorized.' });
  const id = Number(req.body?.id);
  const tracking = String(req.body?.tracking || '').trim();
  if (!Number.isSafeInteger(id) || id < 1 || tracking.length > 100 || (tracking && !/^[A-Za-z0-9 -]+$/.test(tracking))) return res.status(400).json({ error: 'Invalid order or tracking number.' });
  try {
    const sql = db();
    const updated = await sql`UPDATE orders SET status = 'dispatched', dispatched_at = now(), tracking_number = ${tracking || null} WHERE id = ${id} AND status = 'paid' RETURNING *`;
    if (!updated.length) return res.status(409).json({ error: 'Order is not ready for dispatch.' });
    if (tracking) {
      try {
        const sent = await sendEmail({ to: updated[0].customer_email, ...trackingEmail(updated[0]) });
        await sql`INSERT INTO email_log (kind,reference_id,recipient,status) VALUES ('tracking',${String(id)},${updated[0].customer_email},${sent.dryRun ? 'dry-run' : 'sent'}) ON CONFLICT (kind,reference_id) DO NOTHING`;
        await sql`UPDATE orders SET tracking_sent_at = now() WHERE id = ${id}`;
      } catch (error) {
        await sql`INSERT INTO email_log (kind,reference_id,recipient,status,error) VALUES ('tracking',${String(id)},${updated[0].customer_email},'failed',${error.message}) ON CONFLICT (kind,reference_id) DO UPDATE SET status = 'failed', error = EXCLUDED.error`;
      }
    }
    return res.status(200).json({ ok: true });
  } catch (error) { console.error('Dispatch failed:', error.message); return res.status(503).json({ error: 'Could not dispatch order.' }); }
}
