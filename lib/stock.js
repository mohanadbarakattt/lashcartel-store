import { db } from './db.js';

const defaults = { 'diy-volume': true, 'diy-natural': true, 'pretty-ambition': false, 'mascara': true };
export async function getStock() {
  if (!process.env.DATABASE_URL) return { ...defaults };
  const rows = await db()`SELECT product_key, in_stock FROM stock_status`;
  return { ...defaults, ...Object.fromEntries(rows.map(row => [row.product_key, row.in_stock])) };
}
