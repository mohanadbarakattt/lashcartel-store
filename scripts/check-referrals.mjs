// Referral program: codes, link clicks, checkout discount and order attribution, admin stats.
// Uses an in-memory fake of the Stripe API; no network calls.
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { normalizeCode, referralDiscountCents, commissionCents } from '../lib/referrals.js';

assert.equal(normalizeCode(' sarah10 '), 'SARAH10');
assert.equal(normalizeCode('a b'), null);
assert.equal(referralDiscountCents(8811, 10), 881);
assert.equal(referralDiscountCents(1000, 90), 500); // capped at 50%
assert.equal(commissionCents(10000, 15), 1500);

const products = []; const intents = [];
const iter = list => ({ async *[Symbol.asyncIterator]() { yield* list; } });
const R = Stripe.resources;
R.Products.prototype.list = () => iter(products);
R.Products.prototype.create = async p => { const o = { id: 'prod_' + products.length, active: true, created: products.length, ...p, metadata: { ...p.metadata } }; products.push(o); return o; };
R.Products.prototype.update = async (id, p) => { const o = products.find(x => x.id === id); if ('active' in p) o.active = p.active; Object.assign(o.metadata, p.metadata || {}); return o; };
R.PaymentIntents.prototype.create = async p => { const o = { id: 'pi_' + intents.length, client_secret: 's', status: 'requires_payment_method', created: 1, ...p }; intents.push(o); return o; };
R.PaymentIntents.prototype.search = ({ query }) => { assert.match(query, /lc_referred/); return iter(intents.filter(i => i.status === 'succeeded' && i.metadata.lc_referred === 'true')); };

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.ADMIN_SESSION_SECRET = 'test-secret';
process.env.VERCEL_ENV = 'preview';
delete process.env.DATABASE_URL;
const { adminCookie } = await import('../lib/admin-auth.js');
const admin = (await import('../api/admin-referrals.js')).default;
const referral = (await import('../api/referral.js')).default;
const checkout = (await import('../api/create-payment-intent.js')).default;

function call(handler, req) {
  return new Promise((resolve, reject) => {
    const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
      json(b) { resolve({ status: this.code, body: b }); return this; }, end() { resolve({ status: this.code }); return this; } };
    Promise.resolve(handler({ headers: {}, query: {}, ...req }, res)).catch(reject);
  });
}
const cookie = adminCookie().split(';')[0];
const adminHeaders = { cookie, origin: 'https://shop.test', host: 'shop.test' };

assert.equal((await call(admin, { method: 'GET' })).status, 401, 'admin needs sign-in');
let r = await call(admin, { method: 'POST', headers: adminHeaders, body: { action: 'create', influencer: 'Sarah', code: 'sarah10', discountPercent: 10, commissionPercent: 15 } });
assert.equal(r.status, 200); assert.equal(r.body.referral.code, 'SARAH10');
r = await call(admin, { method: 'POST', headers: adminHeaders, body: { action: 'create', influencer: 'Dup', code: 'SARAH10' } });
assert.equal(r.status, 400, 'duplicate rejected');

// Link click
assert.equal((await call(referral, { method: 'POST', body: { code: 'sarah10' } })).status, 200);
assert.equal((await call(referral, { method: 'POST', body: { code: 'NOPE1' } })).status, 404);
assert.equal((await call(referral, { method: 'GET', query: { code: 'SARAH10' } })).body.discountPercent, 10);

// Checkout with code: 2 kits = 9790 - 979 bulk = 8811, -10% = 881, +495 shipping
const items = [{ name: 'DIY Cluster Lash Kit — Volume', quantity: 2 }];
r = await call(checkout, { method: 'POST', body: { items, customerEmail: 'a@b.co', referralCode: 'sarah10', referralTyped: true } });
assert.equal(r.status, 200); assert.equal(r.body.amount, 8811 - 881 + 495); assert.equal(r.body.referralCode, 'SARAH10');
assert.equal(intents[0].metadata.referral_code, 'SARAH10'); assert.equal(intents[0].metadata.lc_referred, 'true');
// Without code: unchanged price, no attribution
r = await call(checkout, { method: 'POST', body: { items, customerEmail: 'a@b.co' } });
assert.equal(r.body.amount, 9306); assert.equal(intents[1].metadata.referral_code, undefined);
// Invalid typed code is rejected; disabled code stops working
assert.equal((await call(checkout, { method: 'POST', body: { items, customerEmail: 'a@b.co', referralCode: 'BAD99', referralTyped: true } })).status, 400);

// Mark the referred order paid, then read stats
Object.assign(intents[0], { status: 'succeeded', amount_received: intents[0].amount, latest_charge: { amount_refunded: 0 } });
r = await call(admin, { method: 'GET', headers: adminHeaders });
const s = r.body.referrals[0];
assert.equal(s.clicks, 1); assert.equal(s.orders, 1);
assert.equal(s.revenueCents, 8811 - 881); assert.equal(s.commissionCents, Math.round((8811 - 881) * 0.15));

await call(admin, { method: 'POST', headers: adminHeaders, body: { action: 'toggle', code: 'SARAH10', active: false } });
assert.equal((await call(referral, { method: 'GET', query: { code: 'SARAH10' } })).status, 404, 'disabled code invalid');
console.log('Referral codes, clicks, checkout discount, attribution and stats passed.');
