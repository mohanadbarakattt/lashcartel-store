import { createHmac, timingSafeEqual } from 'node:crypto';

export function sign(scope, id) {
  if (!process.env.LINK_SIGNING_SECRET) throw new Error('LINK_SIGNING_SECRET is not configured.');
  return createHmac('sha256', process.env.LINK_SIGNING_SECRET).update(`${scope}:${id}`).digest('hex');
}
export function validSignature(scope, id, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(sign(scope, id), 'hex');
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function siteUrl(path) {
  const base = process.env.PUBLIC_SITE_URL || 'https://www.lashcartelcosmetics.com';
  return new URL(path, base).toString();
}
