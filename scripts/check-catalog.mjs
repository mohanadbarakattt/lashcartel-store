import { readFileSync } from 'node:fs';
import { CATALOG, ADDONS, quote } from '../lib/catalog.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('../assets/catalog.js', import.meta.url), 'utf8'), context);
for (const [name, product] of Object.entries(CATALOG)) {
  assert.equal(context.window.LC_CATALOG[name], product.cents / 100, `Browser price differs for ${name}`);
}
// Buy 2 Kits, Get Free Delivery: $4.95 flat, free with 2+ lash kits, no percentage discount.
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }]).total, 5390);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }]).shipping, 495);
const two = quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 2 }]);
assert.equal(two.total, 9790); assert.equal(two.shipping, 0); assert.equal(two.discount, 0); assert.equal(two.freeDelivery, true);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'DIY Cluster Lash Kit — Natural', quantity: 1 }]).total, 9790);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 3 }]).total, 14685);
// Mascara is not a kit: kit + mascara still pays delivery; 2 mascaras pay delivery
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 1 }]).total, 7490);
assert.equal(quote([{ name: 'Ultra Fine Precision Mascara', quantity: 2 }]).total, 4695);
// Pretty Ambition out of stock = pre-order (still sold, line flagged); in stock = normal line.
{ const pre = quote([{ name: 'Pretty Ambition', quantity: 1 }]); assert.equal(pre.lines[0].preorder, true); assert.equal(pre.total, 5199 + 495); }
assert.equal(quote([{ name: 'Pretty Ambition', quantity: 1 }], { 'pretty-ambition': true }).lines[0].preorder, undefined);
assert.equal(quote([{ name: 'Pretty Ambition', quantity: 1 }, { name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }]).shipping, 0);
assert.throws(() => quote([{ name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]), /not available/);
assert.throws(() => quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]), /not available/);
ADDONS['Ultra Fine Precision Mascara'].addonPriceCents = 1500;
assert.throws(() => quote([{ name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]), /require another product/);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]).total, 6890);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 2 }, { name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]).total, 11290);
ADDONS['Ultra Fine Precision Mascara'].addonPriceCents = null;
console.log('Catalogue parity and checkout totals passed.');
