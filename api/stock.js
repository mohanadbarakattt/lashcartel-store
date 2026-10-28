import { getStock } from '../lib/stock.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json(await getStock()); }
  catch (error) { console.error('Stock read failed:', error.message); return res.status(503).json({ error: 'Stock status unavailable.' }); }
}
