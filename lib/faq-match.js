export const FALLBACK = 'I can only help with questions about Lash Cartel products, application, removal, wear time and aftercare. For anything else, please contact the Lash Cartel team at Lashcartel.co@outlook.com or through our Contact page.';

export function matchFaq(input) {
  const text = String(input).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const has = pattern => pattern.test(text);
  const pre = has(/pre glued|preglued|press on|pretty ambition/);
  const diy = has(/diy|classic|volume|bond and seal/);
  if (has(/longer than (seven|7)|more than (seven|7) days|past (seven|7) days/)) return [2];
  if (has(/last|lasting|long|days|duration|wear time/)) return pre ? [1] : diy ? [6] : [1, 6];
  if (has(/difference|compare|versus| vs |diy or|pre glued or|which type/)) return [8];
  if (has(/which|choose|recommend|match|best for me/)) return [12];
  if (has(/glue|bond|seal|adhesive/) && has(/need|require|have to|separate/)) return [3];
  if (has(/shower|wash|water|wet/)) return [4];
  if (has(/reuse|reusable|again|second time/)) return [5];
  if (has(/included|include|inside|whats in|what is in|what in|comes with|contain/) && has(/kit|diy|cluster|box/)) return [7];
  if (has(/beginner|first time|new to lashes/)) return diy ? [9] : [12];
  if (has(/remove|take off|get off/)) return pre ? [] : [10];
  if (has(/sleep|overnight|bed/)) return [11];
  if (has(/damage|ruin|harm|natural lashes safe/)) return [13];
  return [];
}
