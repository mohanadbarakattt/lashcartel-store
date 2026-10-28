import { db } from '../../lib/db.js';
import { sendEmail } from '../../lib/email.js';
import { cartEmail } from '../../lib/cart-emails.js';
import { getStock } from '../../lib/stock.js';
import { CATALOG } from '../../lib/catalog.js';
import { dueStage } from '../../lib/cart-schedule.js';

export default async function handler(req,res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  try {
    const sql = db();
    const stock = await getStock();
    const carts = await sql`SELECT * FROM carts WHERE consent = true AND purchased_at IS NULL AND unsubscribed_at IS NULL AND reminders_sent < 3 AND updated_at < now() - interval '2 hours' ORDER BY updated_at LIMIT 50`;
    let sent = 0;
    for (const cart of carts) {
      const stage = dueStage(cart);
      if (stage < 0) continue;
      const available = cart.items.filter(item => CATALOG[item.name] && stock[CATALOG[item.name].stockKey]);
      if (!available.length) continue;
      const claimed = await sql`UPDATE carts SET reminders_sent = reminders_sent + 1 WHERE id = ${cart.id} AND reminders_sent = ${stage} AND purchased_at IS NULL AND unsubscribed_at IS NULL RETURNING id`;
      if (!claimed.length) continue;
      try {
        await sendEmail({ to:cart.email, ...cartEmail({ ...cart, items:available }, stage) });
        sent++;
      } catch (error) {
        await sql`UPDATE carts SET reminders_sent = ${stage} WHERE id = ${cart.id} AND reminders_sent = ${stage + 1}`;
        console.error('Cart reminder failed:',error.message);
      }
    }
    return res.status(200).json({ processed:carts.length,sent });
  } catch (error) { console.error('Cart cron failed:',error.message); return res.status(503).json({ error:'Cart reminders failed.' }); }
}
