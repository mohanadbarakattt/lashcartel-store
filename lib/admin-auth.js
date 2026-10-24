import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

function mac(value) { return createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(value).digest('hex'); }
export function adminCookie() {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  const expiry = String(Date.now() + 12 * 60 * 60 * 1000);
  return `lc_admin=${expiry}.${mac(expiry)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`;
}
export function isAdmin(req) {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const value = /(?:^|;\s*)lc_admin=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '';
  const [expiry, signature] = value.split('.');
  if (!/^\d{13}$/.test(expiry || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expiry) < Date.now()) return false;
  return timingSafeEqual(Buffer.from(mac(expiry), 'hex'), Buffer.from(signature, 'hex'));
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
export function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return createHash('sha256').update(ip + ':' + (process.env.ENQUIRY_RATE_SALT || 'lash-cartel')).digest('hex');
}
export function passwordMatches(value) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const a = createHash('sha256').update(String(value)).digest();
  const b = createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  return timingSafeEqual(a, b);
}
