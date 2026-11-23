// Checks the November Giveaway rules: pricing, timing, validation, kit tickets, winner picking, phone format.
import assert from 'node:assert/strict';
import { GIVEAWAY, priceCents, phase, cleanNumbers, cleanBuyer, kitCount, pickWinners, ticketMessages } from '../lib/giveaway.js';
import { toE164 } from '../lib/sms.js';

assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(priceCents), [0, 500, 1000, 1000, 1500, 2000, 2000, 2500]);

const g = { opensAt: '2026-11-26T00:00:00+11:00', closesAt: '2026-11-29T18:00:00+11:00' };
assert.equal(phase(Date.parse('2026-11-25T23:59:59+11:00'), g), 'before');
assert.equal(phase(Date.parse('2026-11-26T00:00:00+11:00'), g), 'open');
assert.equal(phase(Date.parse('2026-11-29T17:59:59+11:00'), g), 'open');
assert.equal(phase(Date.parse('2026-11-29T18:00:00+11:00'), g), 'closed');

assert.deepEqual(cleanNumbers([41, 7, '85']), [7, 41, 85]);
for (const bad of [[], [0], [121], [1.5], [7, 7], 'x', Array.from({ length: GIVEAWAY.maxPerOrder + 1 }, (_, i) => i + 1)]) assert.throws(() => cleanNumbers(bad));

assert.deepEqual(cleanBuyer({ name: ' Jess M ', email: 'JESS@x.com ', phone: '0412 345 678' }), { name: 'Jess M', email: 'jess@x.com', phone: '0412 345 678' });
assert.throws(() => cleanBuyer({ name: 'J', email: 'a@b.co', phone: '0412345678' }));
assert.throws(() => cleanBuyer({ name: 'Jess', email: 'nope', phone: '0412345678' }));
assert.throws(() => cleanBuyer({ name: 'Jess', email: 'a@b.co', phone: '12' }));

assert.equal(kitCount([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 2 }, { name: 'DIY Cluster Lash Kit — Natural', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 3 }]), 3);
assert.equal(kitCount([{ name: 'Pretty Ambition', quantity: 1 }]), 0);

const sold = [3, 7, 12, 41, 85];
for (let i = 0; i < 200; i++) {
  const w = pickWinners(sold);
  assert.equal(w.length, 3); assert.equal(new Set(w).size, 3); assert.ok(w.every(n => sold.includes(n)));
}
assert.throws(() => pickWinners([1, 2]));

assert.equal(toE164('0412 345 678'), '+61412345678');
assert.equal(toE164('+61 412 345 678'), '+61412345678');
assert.equal(toE164('+64 21 234 5678'), '+64212345678');
assert.equal(toE164('02 9999 1234'), null); // Sydney landline: never texted
assert.equal(toE164('12345'), null);

const m = ticketMessages({ buyer: { name: 'Jess Smith', email: 'j@x.com', phone: '0412345678' }, numbers: [7, 41], replaced: [] });
assert.match(m.email.subject, /07, 41/); assert.match(m.sms, /07, 41/); assert.match(m.email.html, /You&#39;re in, Jess|You're in, Jess/);
assert.ok(m.sms.length <= 160 * 2, 'SMS stays short');

console.log('Giveaway pricing, timing, validation, kit tickets, winner picks and messages passed.');
