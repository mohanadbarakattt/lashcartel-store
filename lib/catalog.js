// Owner-approved retail prices.
import { readFileSync } from 'node:fs';
export const CATALOG = Object.freeze({
  'DIY Cluster Lash Kit — Volume': { cents: 4895, kind: 'lash', stockKey: 'diy-volume' },
  'DIY Cluster Lash Kit — Natural': { cents: 4895, kind: 'lash', stockKey: 'diy-natural' },
  'DIY Cluster Lash Kit': { cents: 4895, kind: 'lash', stockKey: 'diy-volume' }, // older saved carts
  'Pretty Ambition': { cents: 5199, kind: 'lash', stockKey: 'pretty-ambition', soldOut: true },
  'Ultra Fine Precision Mascara': { cents: 2100, kind: 'mascara', stockKey: 'mascara' },
});

export const SHIPPING_CENTS = 495;
export const BULK_DISCOUNT_RATE = 0.10;
export const BULK_DISCOUNT_MIN_QTY = 2;
export const GIFT_OPTIONS = Object.freeze(['Tea Tree Mint Foot Mask', 'Coconut Repair Foot Mask']);
// Offers with a null price cannot be purchased or shown.
export const ADDONS = Object.freeze(Object.fromEntries(
  Object.values(JSON.parse(readFileSync(new URL('../data/addons.json', import.meta.url), 'utf8')))
    .map(offer => [offer.productName, offer])
));

export function price(name) {
  const item = CATALOG[name];
  if (!item) throw new Error(`Unknown product: ${name}`);
  return item.cents / 100;
}

export function quote(items, stock = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Cart is empty.');
  let subtotal = 0;
  let quantity = 0;
  let bulkSubtotal = 0;
  let bulkQuantity = 0;
  const hasRegularItem = items.some(item => !item.addon);
  const lines = items.map(item => {
    const product = CATALOG[item.name];
    const qty = Number(item.quantity ?? item.qty);
    if (!product) throw new Error(`Unknown product: ${item.name}`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error(`Invalid quantity for ${item.name}`);
    const soldOut = Object.hasOwn(stock, product.stockKey) ? !stock[product.stockKey] : product.soldOut;
    if (soldOut) throw new Error(`${item.name} is sold out.`);
    const offer = ADDONS[item.name];
    if (item.addon && (!offer || offer.addonPriceCents === null)) throw new Error('This add-on is not available yet.');
    if (item.addon && !hasRegularItem) throw new Error('Add-ons require another product in your bag.');
    const unitCents = item.addon ? offer.addonPriceCents : product.cents;
    const lineCents = unitCents * qty;
    subtotal += lineCents;
    quantity += qty;
    if (!item.addon || offer.countsTowardBulkDiscount) {
      bulkSubtotal += lineCents;
      bulkQuantity += qty;
    }
    return { name: item.name, quantity: qty, unitCents, lineCents, kind: product.kind, addon: !!item.addon };
  });
  const discount = bulkQuantity >= BULK_DISCOUNT_MIN_QTY ? Math.round(bulkSubtotal * BULK_DISCOUNT_RATE) : 0;
  return { lines, subtotal, discount, shipping: SHIPPING_CENTS, total: subtotal - discount + SHIPPING_CENTS };
}
