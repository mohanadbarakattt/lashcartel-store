import { createHmac, timingSafeEqual } from 'node:crypto';

// Uses MEMBER_SESSION_SECRET, or a key derived from ADMIN_SESSION_SECRET so no extra setting is needed.
function secret() {
  if (process.env.MEMBER_SESSION_SECRET) return process.env.MEMBER_SESSION_SECRET;
  if (process.env.ADMIN_SESSION_SECRET) return createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update('lash-cartel-member-sessions').digest('hex');
  return '';
}
function signature(memberId, expiry) {
  return createHmac('sha256', secret()).update(`${memberId}:${expiry}`).digest('hex');
}
export function memberCookie(memberId) {
  if (!secret()) throw new Error('Member sessions are not configured.');
  const expiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
  return `lc_member=${memberId}.${expiry}.${signature(memberId, expiry)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`;
}
export function memberId(req) {
  if (!secret()) return null;
  const cookie = /(?:^|;\s*)lc_member=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '';
  const [id, expiry, mac] = cookie.split('.');
  if (!/^\d+$/.test(id || '') || !/^\d{13}$/.test(expiry || '') || !/^[a-f0-9]{64}$/.test(mac || '') || Number(expiry) < Date.now()) return null;
  const expected = Buffer.from(signature(id, expiry), 'hex');
  return timingSafeEqual(expected, Buffer.from(mac, 'hex')) ? Number(id) : null;
}
