// Influencer referral codes. Stored as Stripe Products tagged lc_referral=true, so they
// persist with the existing live Stripe account and need no extra database.
// Orders are attributed through PaymentIntent metadata (referral_code).
import Stripe from 'stripe';

export const MAX_DISCOUNT_PERCENT = 50;
export const MAX_COMMISSION_PERCENT = 50;

export function normalizeCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9_-]{3,24}$/.test(code) ? code : null;
}

export function clampPercent(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.round(n * 100) / 100);
}

// Referral discount is a percentage of the product subtotal after the Buy-2 discount.
export function referralDiscountCents(productCentsAfterBulk, percent) {
  return Math.max(0, Math.round(productCentsAfterBulk * clampPercent(percent, MAX_DISCOUNT_PERCENT) / 100));
}

// Commission is paid on product revenue (excludes shipping, net of refunds).
export function commissionCents(productRevenueCents, percent) {
  return Math.max(0, Math.round(productRevenueCents * clampPercent(percent, MAX_COMMISSION_PERCENT) / 100));
}

let client = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return client ||= new Stripe(process.env.STRIPE_SECRET_KEY);
}
export function setStripeForTests(fake) { client = fake; }

function fromProduct(p) {
  const m = p.metadata || {};
  return {
    id: p.id,
    code: m.code,
    influencer: m.influencer || '',
    contact: m.contact || '',
    discountPercent: Number(m.discount_percent || 0),
    commissionPercent: Number(m.commission_percent || 0),
    clicks: Number(m.clicks || 0),
    active: p.active,
    createdAt: p.created,
  };
}

export async function listCodes() {
  const out = [];
  for await (const p of stripe().products.list({ limit: 100 })) {
    if (p.metadata?.lc_referral === 'true' && p.metadata?.code) out.push(fromProduct(p));
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function findCode(code, { activeOnly = true } = {}) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const all = await listCodes();
  return all.find(c => c.code === normalized && (!activeOnly || c.active)) || null;
}

export async function createCode({ code, influencer, contact, discountPercent, commissionPercent }) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error('Code must be 3-24 letters, numbers, - or _.');
  const name = String(influencer || '').trim().slice(0, 80);
  if (!name) throw new Error('Enter the influencer name.');
  if (await findCode(normalized, { activeOnly: false })) throw new Error('That code already exists.');
  const p = await stripe().products.create({
    name: `Referral code ${normalized} (${name})`,
    description: 'Lash Cartel influencer referral code. Not a sellable product.',
    metadata: {
      lc_referral: 'true', code: normalized, influencer: name,
      contact: String(contact || '').trim().slice(0, 200),
      discount_percent: String(clampPercent(discountPercent, MAX_DISCOUNT_PERCENT)),
      commission_percent: String(clampPercent(commissionPercent, MAX_COMMISSION_PERCENT)),
      clicks: '0',
    },
  });
  return fromProduct(p);
}

export async function setActive(code, active) {
  const found = await findCode(code, { activeOnly: false });
  if (!found) throw new Error('Code not found.');
  return fromProduct(await stripe().products.update(found.id, { active: !!active }));
}

export async function recordClick(code) {
  const found = await findCode(code);
  if (!found) return null;
  await stripe().products.update(found.id, { metadata: { clicks: String(found.clicks + 1) } });
  return found.code;
}

// Paid orders per code, from Stripe PaymentIntents.
export async function ordersByCode() {
  const byCode = {};
  const iter = stripe().paymentIntents.search({
    query: "status:'succeeded' AND metadata['lc_referred']:'true'",
    limit: 100,
    expand: ['data.latest_charge'],
  });
  for await (const pi of iter) {
    const code = pi.metadata?.referral_code;
    if (!code) continue;
    const refunded = pi.latest_charge?.amount_refunded || 0;
    const shipping = Number(pi.metadata?.shipping_cents || 495);
    const productRevenue = Math.max(0, pi.amount_received - shipping - refunded);
    (byCode[code] ||= []).push({
      orderNumber: pi.metadata?.order_number || pi.id,
      created: pi.created,
      totalCents: pi.amount_received,
      refundedCents: refunded,
      productRevenueCents: productRevenue,
    });
  }
  return byCode;
}

export function summarize(codes, byCode) {
  return codes.map(c => {
    const orders = (byCode[c.code] || []).sort((a, b) => b.created - a.created);
    const fullyRefunded = o => o.refundedCents >= o.totalCents;
    const revenue = orders.reduce((s, o) => s + o.productRevenueCents, 0);
    return {
      ...c,
      orders: orders.filter(o => !fullyRefunded(o)).length,
      revenueCents: revenue,
      commissionCents: commissionCents(revenue, c.commissionPercent),
      conversionPercent: c.clicks ? Math.round(orders.length / c.clicks * 1000) / 10 : 0,
      recentOrders: orders.slice(0, 20),
    };
  });
}
