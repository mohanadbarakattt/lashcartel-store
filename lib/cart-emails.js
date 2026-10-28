import { CATALOG } from './catalog.js';
import { escapeHtml } from './email.js';
import { sign, siteUrl } from './links.js';

const image = {
  'DIY Cluster Lash Kit — Volume':'/assets/products/cluster-lash-kit/Volume/volume_main.jpg',
  'DIY Cluster Lash Kit — Natural':'/assets/products/cluster-lash-kit/Natural/Natural_Main.jpg',
  'Pretty Ambition':'/assets/products/pretty-ambition/pa-result.jpg',
  'Ultra Fine Precision Mascara':'/assets/products/mascara/mascara-promo.jpg',
};

const messages = [
  { subject:'Baddie, you left something behind 💋', text:'Hey Baddie,\nLooks like you left a little something in your cart...\nYour Lash Cartel favourites are still waiting for you, and trust us, your next lash look is going to be worth it.', button:'COMPLETE MY ORDER', tail:'Because good lashes aren’t just an accessory. They’re the finishing touch.' },
  { subject:'Your lash look is waiting, Baddie 💋', text:'Hey Baddie,\nStill thinking about those lashes?\nWhether you’re after effortless, everyday beauty or a full glam moment, Lash Cartel has your next look covered.\nYour selected products are still waiting in your cart.', button:'RETURN TO MY CART', tail:'A little confidence goes a long way. And the right lashes make all the difference.' },
  { subject:'Last reminder, Baddie. Your cart is waiting 💋', text:'Hey Baddie,\nJust a little reminder from us before we stop filling your inbox.\nYou left some Lash Cartel favourites behind, and we’d love for you to experience them.\nReady to complete your order?', button:'COMPLETE MY ORDER', tail:'No pressure, Baddie. We’re here whenever you’re ready.' },
];

export function cartEmail(cart, stage) {
  const message = messages[stage];
  if (!message) throw new Error('Invalid reminder stage.');
  const restore = siteUrl(`/restore-cart?id=${cart.id}&sig=${sign('cart',cart.id)}`);
  const unsubscribe = siteUrl(`/unsubscribe?type=cart&id=${cart.id}&sig=${sign('cart',cart.id)}`);
  const products = cart.items.map(item => `${item.name} × ${item.quantity} · $${(CATALOG[item.name].cents/100).toFixed(2)} AUD`).join('\n');
  const productRows = cart.items.map(item => `<tr><td><img src="${siteUrl(image[item.name])}" width="80" alt="${escapeHtml(item.name)}"></td><td>${escapeHtml(item.name)} × ${item.quantity}<br>$${(CATALOG[item.name].cents/100).toFixed(2)} AUD</td></tr>`).join('');
  const html = `<table role="presentation" width="100%" style="background:#fffaf8;font-family:Arial,sans-serif;color:#2c2622"><tr><td align="center"><table role="presentation" width="560" style="max-width:100%;background:white;padding:24px"><tr><td><img src="${siteUrl('/assets/logo.png')}" width="130" alt="Lash Cartel"><h1>${escapeHtml(message.subject)}</h1><p>Your next favourite lash look is one click away.</p>${message.text.split('\n').map(line=>`<p>${escapeHtml(line)}</p>`).join('')}<table role="presentation">${productRows}</table><p><a href="${restore}" style="display:inline-block;background:#2c2622;color:white;padding:14px 22px;text-decoration:none">${message.button}</a></p><p>${escapeHtml(message.tail)}</p><p>With love, Lash Cartel 💋</p><p style="font-size:12px">Lash Cartel • Confidence in every lash · Lashcartel.co@outlook.com<br><a href="${unsubscribe}">Unsubscribe</a></p></td></tr></table></td></tr></table>`;
  const text = `${message.text}\n${products}\n${message.button}: ${restore}\n${message.tail}\nWith love, Lash Cartel 💋\nLash Cartel Cosmetics · Lashcartel.co@outlook.com\nUnsubscribe: ${unsubscribe}`;
  return { subject:message.subject, html, text };
}
