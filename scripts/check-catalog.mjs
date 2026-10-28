import { readFileSync } from 'node:fs';
import { CATALOG, ADDONS, quote } from '../lib/catalog.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('../assets/catalog.js', import.meta.url), 'utf8'), context);
for (const [name, product] of Object.entries(CATALOG)) {
  assert.equal(context.window.LC_CATALOG[name], product.cents / 100, `Browser price differs for ${name}`);
}
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }]).total, 5390);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 2 }]).total, 9306);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 1 }]).total, 6790);
assert.throws(() => quote([{ name: 'Pretty Ambition', quantity: 1 }]), /sold out/);
assert.throws(() => quote([{ name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]), /not available/);
assert.throws(() => quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]), /not available/);
ADDONS['Ultra Fine Precision Mascara'].addonPriceCents = 1500;
assert.throws(() => quote([{ name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]), /require another product/);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 1 }, { name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]).total, 6890);
assert.equal(quote([{ name: 'DIY Cluster Lash Kit — Volume', quantity: 2 }, { name: 'Ultra Fine Precision Mascara', quantity: 1, addon: true }]).total, 10806);
ADDONS['Ultra Fine Precision Mascara'].addonPriceCents = null;
console.log('Catalogue parity and checkout totals passed.');
