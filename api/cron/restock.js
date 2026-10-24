import { db } from '../../lib/db.js';
import { CATALOG } from '../../lib/catalog.js';
import { escapeHtml, sendEmail } from '../../lib/email.js';
import { sign, siteUrl } from '../../lib/links.js';

const products = {
  'pretty-ambition': { name:'Pretty Ambition', url:'/pretty-ambition', image:'/assets/products/pretty-ambition/pa-result.jpg' },
  'diy-volume': { name:'DIY Cluster Lash Kit — Volume', url:'/cluster-lash-kit?style=Volume', image:'/assets/products/cluster-lash-kit/Volume/volume_main.jpg' },
  'diy-natural': { name:'DIY Cluster Lash Kit — Natural', url:'/cluster-lash-kit?style=Natural', image:'/assets/products/cluster-lash-kit/Natural/Natural_Main.jpg' },
  mascara: { name:'Ultra Fine Precision Mascara', url:'/mascara', image:'/assets/products/mascara/mascara-promo.jpg' },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  try {
    const sql = db();
    const rows = await sql`SELECT s.id,s.product_key,s.email FROM stock_subscriptions s JOIN stock_status st ON st.product_key = s.product_key
      WHERE st.in_stock = true AND s.notified_at IS NULL AND s.unsubscribed_at IS NULL ORDER BY s.created_at LIMIT 50`;
    let sentCount = 0;
    for (const row of rows) {
      const claimed = await sql`UPDATE stock_subscriptions SET notified_at = now() WHERE id = ${row.id} AND notified_at IS NULL RETURNING id`;
      if (!claimed.length) continue;
      const product = products[row.product_key];
      if (!product) continue;
      const url = siteUrl(product.url);
      const unsubscribe = siteUrl(`/unsubscribe?type=stock&id=${row.id}&sig=${sign('stock',row.id)}`);
      const price = `$${(CATALOG[product.name].cents/100).toFixed(2)} AUD`;
      const subject = 'She’s back, Baddie. Don’t miss out 💋';
      const text = `Hey Baddie,\nYou asked. We listened. One of your Lash Cartel favourites is officially back in stock!\n${product.name} · ${price}\nShe’s back and ready to join your lash collection.\nSHOP NOW: ${url}\nStock availability can change, so don’t leave your favourites waiting too long.\nWith love, Lash Cartel 💋\nUnsubscribe: ${unsubscribe}`;
      const html = `<table role="presentation" width="100%" style="background:#fffaf8;font-family:Arial,sans-serif;color:#2c2622"><tr><td align="center"><table role="presentation" width="560" style="background:white;padding:24px"><tr><td><img src="${siteUrl('/assets/logo.png')}" alt="Lash Cartel" width="130"><h1>${escapeHtml(subject)}</h1><p>Hey Baddie,</p><p>You asked. We listened. One of your Lash Cartel favourites is officially back in stock!</p><img src="${siteUrl(product.image)}" alt="${escapeHtml(product.name)}" width="300"><p>${escapeHtml(product.name)} · ${price}</p><p>She’s back and ready to join your lash collection.</p><p><a href="${url}" style="background:#2c2622;color:white;padding:14px 22px;text-decoration:none">SHOP NOW</a></p><p>Stock availability can change, so don’t leave your favourites waiting too long.</p><p>With love, Lash Cartel 💋</p><p><a href="${unsubscribe}">Unsubscribe</a></p></td></tr></table></td></tr></table>`;
      try { await sendEmail({ to:row.email,subject,html,text }); sentCount++; }
      catch (error) { await sql`UPDATE stock_subscriptions SET notified_at = null WHERE id = ${row.id}`; console.error('Restock email failed:', error.message); }
    }
    return res.status(200).json({ processed:rows.length,sent:sentCount });
  } catch (error) { console.error('Restock cron failed:', error.message); return res.status(503).json({ error:'Restock dispatch failed.' }); }
}
