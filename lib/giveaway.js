// November Giveaway: ticket rules, database helpers and messages. Settings live in data/giveaway.json.
import { readFileSync } from 'node:fs';
import { randomInt, randomUUID } from 'node:crypto';
import { escapeHtml, sendEmail } from './email.js';
import { wrap } from './order-emails.js';
import { sendSms, toE164 } from './sms.js';
import { siteUrl } from './links.js';

export const GIVEAWAY = Object.freeze(JSON.parse(readFileSync(new URL('../data/giveaway.json', import.meta.url), 'utf8')));
export const KIT_NAMES = Object.freeze(['DIY Cluster Lash Kit — Volume', 'DIY Cluster Lash Kit — Natural', 'DIY Cluster Lash Kit']);

// $5 each, every 3 tickets $10
export const priceCents = count => Math.floor(count / 3) * 1000 + (count % 3) * 500;

export function phase(now = Date.now(), g = GIVEAWAY) {
  if (now < Date.parse(g.opensAt)) return 'before';
  if (now < Date.parse(g.closesAt)) return 'open';
  return 'closed';
}

export function cleanNumbers(list, g = GIVEAWAY) {
  if (!Array.isArray(list) || !list.length) throw new Error('Pick at least one number.');
  if (list.length > g.maxPerOrder) throw new Error(`You can pick up to ${g.maxPerOrder} numbers at a time.`);
  const numbers = [...new Set(list.map(Number))];
  if (numbers.length !== list.length || numbers.some(n => !Number.isInteger(n) || n < 1 || n > g.total)) throw new Error(`Pick numbers from 1 to ${g.total}.`);
  return numbers.sort((a, b) => a - b);
}

export function cleanBuyer({ name, email, phone } = {}) {
  name = String(name || '').trim(); email = String(email || '').trim().toLowerCase(); phone = String(phone || '').trim();
  if (name.length < 2 || name.length > 80) throw new Error('Enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 250) throw new Error('Enter a valid email address.');
  if (!/^\+?[\d\s()-]{8,20}$/.test(phone)) throw new Error('Enter a mobile number we can call if you win.');
  return { name, email, phone };
}

export const kitCount = items => (items || []).filter(i => KIT_NAMES.includes(i.name)).reduce((sum, i) => sum + Number(i.quantity || 0), 0);

// Secure random pick of `count` different numbers from the sold tickets.
export function pickWinners(sold, count = 3, rand = randomInt) {
  if (sold.length < count) throw new Error(`Need at least ${count} sold tickets to draw.`);
  const pool = [...sold], winners = [];
  while (winners.length < count) winners.push(pool.splice(rand(pool.length), 1)[0]);
  return winners;
}

export const pad = n => String(n).padStart(2, '0');

// ---- Database ----
// Numbers that are sold, refunded or held by someone mid-checkout are not available.
export async function takenNumbers(sql) {
  const rows = await sql`SELECT number FROM giveaway_tickets WHERE status <> 'held' OR hold_expires > now() ORDER BY number`;
  return rows.map(r => r.number);
}

export async function getDraw(sql) {
  const rows = await sql`SELECT winners, starts_at FROM giveaway_draw WHERE id = 1`;
  return rows[0] ? { winners: rows[0].winners, startsAt: new Date(rows[0].starts_at).toISOString() } : null;
}

// Holds every number or none. Returns { holdId } or { taken: [...] }.
export async function holdNumbers(sql, numbers, buyer, g = GIVEAWAY) {
  const holdId = randomUUID();
  const held = await sql`INSERT INTO giveaway_tickets (number, status, hold_id, hold_expires, source, name, email, phone)
    SELECT n, 'held', ${holdId}, now() + make_interval(mins => ${g.holdMinutes}), 'paid', ${buyer.name}, ${buyer.email}, ${buyer.phone}
    FROM unnest(${numbers}::int[]) AS n
    ON CONFLICT (number) DO UPDATE SET status = 'held', hold_id = EXCLUDED.hold_id, hold_expires = EXCLUDED.hold_expires, payment_ref = NULL,
      source = 'paid', name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, paid_at = NULL, created_at = now()
    WHERE giveaway_tickets.status = 'held' AND giveaway_tickets.hold_expires <= now()
    RETURNING number`;
  if (held.length === numbers.length) return { holdId };
  await releaseHold(sql, holdId);
  const got = new Set(held.map(r => r.number));
  return { taken: numbers.filter(n => !got.has(n)) };
}

export const attachPayment = (sql, holdId, paymentRef) => sql`UPDATE giveaway_tickets SET payment_ref = ${paymentRef} WHERE hold_id = ${holdId} AND status = 'held'`;
export const releaseHold = (sql, holdId) => sql`DELETE FROM giveaway_tickets WHERE hold_id = ${holdId} AND status = 'held'`;
export const releasePayment = (sql, paymentRef) => sql`DELETE FROM giveaway_tickets WHERE payment_ref = ${paymentRef} AND status = 'held'`;

// Gives `count` random available numbers to a buyer (free kit tickets, or replacements). Returns the numbers.
export async function assignRandom(sql, count, buyer, paymentRef, source, g = GIVEAWAY) {
  if (count < 1) return [];
  const rows = await sql`INSERT INTO giveaway_tickets (number, status, payment_ref, source, name, email, phone, paid_at)
    SELECT n, 'sold', ${paymentRef}, ${source}, ${buyer.name}, ${buyer.email}, ${buyer.phone}, now()
    FROM generate_series(1, ${g.total}) AS n
    WHERE NOT EXISTS (SELECT 1 FROM giveaway_tickets t WHERE t.number = n AND (t.status <> 'held' OR t.hold_expires > now()))
    ORDER BY random() LIMIT ${count}
    ON CONFLICT (number) DO UPDATE SET status = 'sold', hold_id = NULL, hold_expires = NULL, payment_ref = EXCLUDED.payment_ref,
      source = EXCLUDED.source, name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, paid_at = now(), created_at = now()
    WHERE giveaway_tickets.status = 'held' AND giveaway_tickets.hold_expires <= now()
    RETURNING number`;
  return rows.map(r => r.number).sort((a, b) => a - b);
}

// Payment succeeded: turn its holds into sold tickets. If a hold expired and someone else took
// the number before the payment landed, give a random available number instead.
// Returns { numbers, replaced } the first time, or null if this payment was already processed.
export async function confirmPayment(sql, intent) {
  const paidFor = String(intent.metadata?.numbers || '').split(',').filter(Boolean).length;
  const before = await sql`SELECT count(*)::int AS c FROM giveaway_tickets WHERE payment_ref = ${intent.id} AND status = 'sold'`;
  if (before[0].c >= paidFor) return null;
  await sql`UPDATE giveaway_tickets SET status = 'sold', hold_expires = NULL, paid_at = now() WHERE payment_ref = ${intent.id} AND status = 'held'`;
  const mine = await sql`SELECT number, name, email, phone FROM giveaway_tickets WHERE payment_ref = ${intent.id} AND status = 'sold' ORDER BY number`;
  const buyer = mine[0] || { name: intent.metadata?.buyer_name, email: intent.receipt_email, phone: intent.metadata?.buyer_phone };
  const missing = paidFor - mine.length;
  const replaced = missing > 0 ? await assignRandom(sql, missing, buyer, intent.id, 'paid') : [];
  return { buyer, numbers: [...mine.map(r => r.number), ...replaced].sort((a, b) => a - b), replaced };
}

// Free ticket(s) for DIY kits in a paid store order, while the giveaway is open. Runs once per order.
export async function kitTickets(sql, order, intent, now = Date.now()) {
  const count = kitCount(order.items);
  if (!count || phase(now) !== 'open') return null;
  const ref = `order:${order.id}`;
  const done = await sql`SELECT 1 FROM giveaway_tickets WHERE payment_ref = ${ref} LIMIT 1`;
  if (done.length) return null;
  const buyer = { name: intent.shipping?.name || '', email: order.customer_email, phone: intent.shipping?.phone || '' };
  const numbers = await assignRandom(sql, count, buyer, ref, 'kit');
  return numbers.length ? { buyer, numbers, replaced: [] } : null;
}

export async function startDraw(sql, now = Date.now()) {
  if (phase(now) !== 'closed') throw new Error('The draw can start once tickets close.');
  const existing = await getDraw(sql);
  if (existing) return existing;
  const sold = (await sql`SELECT number FROM giveaway_tickets WHERE status = 'sold'`).map(r => r.number);
  const winners = pickWinners(sold); // [3rd, 2nd, 1st]
  await sql`INSERT INTO giveaway_draw (id, winners, starts_at) VALUES (1, ${winners}::int[], now() + interval '8 seconds') ON CONFLICT (id) DO NOTHING`;
  return getDraw(sql);
}

// ---- Messages ----
const SYD = { timeZone: 'Australia/Sydney', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' };
const when = iso => new Date(iso).toLocaleString('en-AU', SYD);

export function ticketMessages({ buyer, numbers, replaced }, kind = 'paid', g = GIVEAWAY) {
  const list = numbers.map(pad).join(', ');
  const first = (buyer.name || '').split(/\s+/)[0] || 'Baddie';
  const intro = kind === 'kit' ? `Your DIY lash kit came with a free ticket${numbers.length > 1 ? 's' : ''} in the Lash Cartel ${g.name}!` : `Thanks for entering the Lash Cartel ${g.name}!`;
  const swap = replaced.length ? ` Your hold on some numbers ran out before payment went through, so we picked ${replaced.map(pad).join(', ')} for you instead.` : '';
  const prizes = g.prizes.map(p => `${p.place}: ${p.name} (value $${p.value})`);
  const title = `You're in, ${first}! 🎟️`;
  const body = `<p>${escapeHtml(intro)}${escapeHtml(swap)}</p><p style="font-size:13px;color:#6b615b">Your ticket number${numbers.length > 1 ? 's' : ''}:</p><p>${numbers.map(n => `<span style="display:inline-block;border:2px solid #d98f86;color:#c2766c;border-radius:8px;padding:4px 12px;margin:0 6px 6px 0;font-size:20px;font-weight:bold">${pad(n)}</span>`).join('')}</p><p>Tickets close <b>${escapeHtml(when(g.closesAt))}</b>. Winners are revealed in a live draw at <b>${escapeHtml(when(g.announceAt))}</b>, posted on TikTok and Instagram, and <b>called by phone</b>.</p><p>${prizes.map(escapeHtml).join('<br>')}</p><p><a href="${siteUrl('/raffle')}" style="display:inline-block;background:#2c2622;color:white;padding:14px 22px;text-decoration:none">VIEW THE GIVEAWAY</a></p><p>Good luck!</p>`;
  return {
    email: { subject: `Your ${g.name} tickets: ${list}`, html: wrap(title, body), text: `${title}\n${intro}${swap}\nYour tickets: ${list}\nTickets close ${when(g.closesAt)}. Winners revealed ${when(g.announceAt)} and called by phone.\n${prizes.join('\n')}\n${siteUrl('/raffle')}\nGood luck! With love, Lash Cartel 💋` },
    sms: `Lash Cartel ${g.name}: you're in! Your ticket${numbers.length > 1 ? 's' : ''}: ${list}. Winners revealed Sun 7pm and called by phone. Good luck! 💖`,
  };
}

// Email + SMS, logged once per payment in email_log so webhook retries don't resend.
export async function sendTickets(sql, result, ref, kind) {
  const { email, sms } = ticketMessages(result, kind);
  const log = async (channel, recipient, status, error = null) => sql`INSERT INTO email_log (kind, reference_id, recipient, status, error)
    VALUES (${`giveaway-${channel}`}, ${ref}, ${recipient}, ${status}, ${error}) ON CONFLICT (kind, reference_id) DO UPDATE SET status = EXCLUDED.status, error = EXCLUDED.error`;
  try { const sent = await sendEmail({ to: result.buyer.email, ...email }); await log('email', result.buyer.email, sent.dryRun ? 'dry-run' : 'sent'); }
  catch (error) { await log('email', result.buyer.email, 'failed', error.message); }
  const to = toE164(result.buyer.phone);
  if (!to) return;
  try { const sent = await sendSms(to, sms); await log('sms', to, sent.skipped ? 'skipped' : 'sent'); }
  catch (error) { await log('sms', to, 'failed', error.message); }
}
