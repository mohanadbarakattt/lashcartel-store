// Lash Cartel raffle: every paid online order = 1 entry. Settings live in data/raffle.json.
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';

export const RAFFLE = Object.freeze(JSON.parse(readFileSync(new URL('../data/raffle.json', import.meta.url), 'utf8')));

const sydneyMidnight = date => Math.floor(new Date(`${date}T00:00:00+11:00`).getTime() / 1000);

let client = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return client ||= new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Entrants come from succeeded Stripe payments made through the site checkout.
export async function listEntrants(config = RAFFLE) {
  let query = "status:'succeeded' AND metadata['source']:'lash-cartel-site'";
  if (config.entriesOpen) query += ` AND created>=${sydneyMidnight(config.entriesOpen)}`;
  if (config.entriesClose) query += ` AND created<${sydneyMidnight(config.entriesClose) + 86400}`;
  const out = [];
  for await (const pi of stripe().paymentIntents.search({ query, limit: 100, expand: ['data.latest_charge'] })) {
    const charge = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
    const name = pi.shipping?.name || charge?.billing_details?.name || '';
    const refunded = charge?.amount_refunded || 0;
    out.push({
      orderId: pi.metadata?.order_number || pi.id,
      firstName: name.trim().split(/\s+/)[0] || '',
      email: pi.receipt_email || charge?.billing_details?.email || '',
      date: new Date(pi.created * 1000).toISOString(),
      code: pi.metadata?.referral_code || '',
      eligible: refunded < (pi.amount_received || pi.amount),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const csvCell = v => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // keep spreadsheet formulas out
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(entrants) {
  const head = ['order_id', 'first_name', 'email', 'date', 'referral_code', 'eligible'];
  return [head.join(','), ...entrants.map(e => [e.orderId, e.firstName, e.email, e.date, e.code, e.eligible ? 'yes' : 'no (refunded)'].map(csvCell).join(','))].join('\n') + '\n';
}
