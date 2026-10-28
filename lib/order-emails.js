import { escapeHtml } from './email.js';
import { sign, siteUrl } from './links.js';

const money = cents => `$${(cents / 100).toFixed(2)} AUD`;
const addressText = address => [address?.line1, address?.line2, address?.city, address?.state, address?.postal_code, address?.country].filter(Boolean).join(', ');
function wrap(title, body) {
  return `<table role="presentation" width="100%" style="background:#fffaf8;font-family:Arial,sans-serif;color:#2c2622"><tr><td align="center"><table role="presentation" width="560" style="max-width:100%;background:#fff;padding:28px"><tr><td><img src="${siteUrl('/assets/logo.png')}" alt="Lash Cartel" width="130"><h1 style="font-size:25px">${escapeHtml(title)}</h1>${body}<p>With love, Lash Cartel 💋</p><p style="font-size:12px">Lash Cartel Cosmetics · Lashcartel.co@outlook.com</p></td></tr></table></td></tr></table>`;
}

export function confirmationEmail(order) {
  const items = order.items.map(item => `${item.name} × ${item.quantity}`).join(', ');
  const lines = order.items.map(item => `<tr><td>${escapeHtml(item.name)} × ${item.quantity}</td><td align="right">${money(item.lineCents)}</td></tr>`).join('');
  const address = addressText(order.shipping_address);
  const url = siteUrl(`/order?id=${order.id}&sig=${sign('order', order.id)}`);
  const title = 'Order confirmed. Your lash era starts now 💋';
  const body = `<p>Hey Baddie,</p><p>Your order is officially confirmed! We’re getting your Lash Cartel favourites ready, and we can’t wait for you to receive them.</p><p>Order Number: ${escapeHtml(order.order_number)}<br>Products: ${escapeHtml(items)}<br>Total Paid: ${money(order.total_cents)}<br>Delivery Address: ${escapeHtml(address)}</p><table role="presentation" width="100%">${lines}<tr><td>Discount</td><td align="right">-${money(order.discount_cents)}</td></tr><tr><td>Delivery</td><td align="right">${money(order.shipping_cents)}</td></tr><tr><td><b>Total, tax included</b></td><td align="right"><b>${money(order.total_cents)}</b></td></tr></table><p>We’ll send you another email with your tracking details as soon as your order is dispatched.</p><p><a href="${url}" style="display:inline-block;background:#2c2622;color:white;padding:14px 22px;text-decoration:none">VIEW MY ORDER</a></p><p>Thank you for choosing Lash Cartel. Every order means so much to our brand.</p>`;
  return { subject: title, html: wrap(title, body), text: `Hey Baddie,\nYour order is officially confirmed! We’re getting your Lash Cartel favourites ready, and we can’t wait for you to receive them.\nOrder Number: ${order.order_number}\nProducts: ${items}\nTotal Paid: ${money(order.total_cents)}\nDelivery Address: ${address}\nDiscount: ${money(order.discount_cents)}\nDelivery: ${money(order.shipping_cents)}\nTax included.\nWe’ll send you another email with your tracking details as soon as your order is dispatched.\nVIEW MY ORDER: ${url}\nThank you for choosing Lash Cartel. Every order means so much to our brand.\nWith love, Lash Cartel 💋` };
}

export function trackingEmail(order) {
  const url = `https://auspost.com.au/mypost/track/details/${encodeURIComponent(order.tracking_number)}`;
  const title = 'Baddie, your lashes are on their way! 📦';
  const body = `<p>Hey Baddie,</p><p>The wait is almost over. Your Lash Cartel order has officially been dispatched, and your new lashes are making their way to you!</p><p>Order Number: ${escapeHtml(order.order_number)}<br>Tracking Number: ${escapeHtml(order.tracking_number)}<br>Delivery Partner: Australia Post</p><p><a href="${url}" style="display:inline-block;background:#2c2622;color:white;padding:14px 22px;text-decoration:none">TRACK MY ORDER</a></p><p>We can’t wait to see you wearing your new lashes. Don’t forget to tag us in your lash looks!</p>`;
  return { subject: title, html: wrap(title, body), text: `Hey Baddie,\nThe wait is almost over. Your Lash Cartel order has officially been dispatched, and your new lashes are making their way to you!\nOrder Number: ${order.order_number}\nTracking Number: ${order.tracking_number}\nDelivery Partner: Australia Post\nTRACK MY ORDER: ${url}\nWe can’t wait to see you wearing your new lashes. Don’t forget to tag us in your lash looks!\nWith love, Lash Cartel 💋` };
}
