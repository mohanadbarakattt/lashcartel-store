// Raffle: entrants from paid Stripe orders, CSV export, admin auth. Fake Stripe, no network.
import assert from 'node:assert/strict';
import Stripe from 'stripe';

const intents = [
  { id: 'pi_1', status: 'succeeded', created: 1794000000, amount: 9790, amount_received: 9790, receipt_email: 'amy@example.com', shipping: { name: 'Amy Lee' }, metadata: { source: 'lash-cartel-site', order_number: 'LC-AAA1', referral_code: 'SARAH10' }, latest_charge: { amount_refunded: 0 } },
  { id: 'pi_2', status: 'succeeded', created: 1794000500, amount: 5390, amount_received: 5390, receipt_email: 'bo@example.com', shipping: { name: '=cmd' }, metadata: { source: 'lash-cartel-site', order_number: 'LC-AAA2' }, latest_charge: { amount_refunded: 5390 } },
];
let lastQuery = '';
Stripe.resources.PaymentIntents.prototype.search = function ({ query }) { lastQuery = query; return { async *[Symbol.asyncIterator]() { yield* intents; } }; };
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.ADMIN_SESSION_SECRET = 'test-secret';

const { RAFFLE, listEntrants, toCsv } = await import('../lib/raffle.js');
assert.equal(RAFFLE.prize, null, 'no prize invented');
assert.equal(RAFFLE.drawDate, null, 'no draw date invented');
const entrants = await listEntrants();
assert.match(lastQuery, /status:'succeeded'/); assert.match(lastQuery, /metadata\['source'\]:'lash-cartel-site'/); assert.match(lastQuery, /created>=/);
assert.deepEqual(entrants.map(e => [e.orderId, e.firstName, e.email, e.code, e.eligible]), [['LC-AAA1', 'Amy', 'amy@example.com', 'SARAH10', true], ['LC-AAA2', '=cmd', 'bo@example.com', '', false]]);
const csv = toCsv(entrants);
assert.match(csv, /^order_id,first_name,email,date,referral_code,eligible\n/);
assert.match(csv, /LC-AAA1,Amy,amy@example.com,.*,SARAH10,yes/);
assert.match(csv, /'=cmd/, 'formula injection neutralised');

const { adminCookie } = await import('../lib/admin-auth.js');
const handler = (await import('../api/admin-raffle.js')).default;
const call = req => new Promise(resolve => { const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { resolve({ status: this.code, body: b }); }, send(b) { resolve({ status: this.code, body: b, headers: this.headers }); }, end() { resolve({ status: this.code }); } }; handler({ method: 'GET', query: {}, headers: {}, ...req }, res); });
assert.equal((await call({})).status, 401, 'admin auth required');
const cookie = adminCookie().split(';')[0];
const r = await call({ headers: { cookie }, query: { format: 'csv' } });
assert.equal(r.status, 200); assert.match(r.headers['Content-Type'], /text\/csv/); assert.match(r.body, /LC-AAA1/);
const j = await call({ headers: { cookie } });
assert.equal(j.body.entrants.length, 2);
console.log('Raffle entrants, CSV export and admin auth passed.');
