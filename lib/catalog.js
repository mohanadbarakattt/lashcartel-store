// Proposed retail prices for the review branch. Confirm with Fats before publishing.
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

export function price(name) {
  const item = CATALOG[name];
  if (!item) throw new Error(`Unknown product: ${name}`);
  return item.cents / 100;
}

export function quote(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Cart is empty.');
  let subtotal = 0;
  let quantity = 0;
  const lines = items.map(item => {
    const product = CATALOG[item.name];
    const qty = Number(item.quantity ?? item.qty);
    if (!product) throw new Error(`Unknown product: ${item.name}`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error(`Invalid quantity for ${item.name}`);
    if (product.soldOut) throw new Error(`${item.name} is sold out.`);
    const lineCents = product.cents * qty;
    subtotal += lineCents;
    quantity += qty;
    return { name: item.name, quantity: qty, unitCents: product.cents, lineCents, kind: product.kind };
  });
  const discount = quantity >= BULK_DISCOUNT_MIN_QTY ? Math.round(subtotal * BULK_DISCOUNT_RATE) : 0;
  return { lines, subtotal, discount, shipping: SHIPPING_CENTS, total: subtotal - discount + SHIPPING_CENTS };
}
