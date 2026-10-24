import { db } from '../lib/db.js';
import { CATALOG, quote } from '../lib/catalog.js';

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).end();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const consent = req.body?.consent === true;
  const input = req.body?.items;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250 || !Array.isArray(input) || !input.length || input.length > 30) return res.status(400).json({ error:'Invalid cart.' });
  const items = [];
  for (const item of input) {
    if (!CATALOG[item.name] || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) return res.status(400).json({ error:'Invalid cart item.' });
    items.push({ name:item.name, quantity:item.quantity, addon:item.addon === true });
  }
  try { quote(items); } catch (error) { return res.status(400).json({ error:error.message }); }
  if (!process.env.DATABASE_URL) return res.status(503).json({ error:'Cart reminders are not configured.' });
  try {
    await db()`INSERT INTO carts (email,items,consent) VALUES (${email},${JSON.stringify(items)}::jsonb,${consent})
      ON CONFLICT (email) DO UPDATE SET items = EXCLUDED.items, consent = EXCLUDED.consent,
      updated_at = now(), reminders_sent = 0, purchased_at = null, unsubscribed_at = null`;
    return res.status(200).json({ ok:true });
  } catch (error) { console.error('Cart snapshot failed:',error.message); return res.status(503).json({ error:'Could not save cart.' }); }
}
