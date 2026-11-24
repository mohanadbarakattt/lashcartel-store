// Cartel Cash: points are credited the moment an order is paid (Stripe webhook or the success page, whichever is first).
// Accounts are created from the order email automatically, so no sign-in email is needed.
import { purchasePoints } from './rewards.js';

export const cashEnabled = () => process.env.CARTEL_CASH_ENABLED !== 'false';

export async function memberForEmail(sql, email) {
  const rows = await sql`INSERT INTO members(email, verified_at) VALUES (${email.toLowerCase()}, now())
    ON CONFLICT(email) DO UPDATE SET verified_at = COALESCE(members.verified_at, now()) RETURNING id`;
  const id = Number(rows[0].id);
  await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) SELECT ${id},join_points,'Welcome to Cartel Cash',${`join:${id}`}
    FROM reward_config WHERE id = TRUE AND join_points > 0 ON CONFLICT(event_key) DO NOTHING`;
  return id;
}

export async function balanceOf(sql, memberId) {
  const rows = await sql`SELECT COALESCE(sum(points),0)::int AS balance FROM points_ledger WHERE member_id = ${memberId}`;
  return rows[0].balance;
}

export async function rewardConfig(sql) {
  const rows = await sql`SELECT * FROM reward_config WHERE id = TRUE`;
  return rows[0];
}

// Largest redeemable amount for this balance and order (whole steps only, keeps at least $1 to pay unless full cover is allowed).
export function bestRedemption(balance, productCents, config) {
  const step = config.redemption_step_points, stepCents = config.redemption_step_cents;
  const limit = productCents - (config.allow_full_cover ? 0 : 100);
  let steps = Math.floor(balance / step);
  steps = Math.min(steps, Math.floor(limit / stepCents));
  if (config.max_discount_cents !== null && config.max_discount_cents !== undefined) steps = Math.min(steps, Math.floor(config.max_discount_cents / stepCents));
  const points = steps * step;
  if (steps < 1 || points < config.minimum_redemption_points) return { points: 0, cents: 0 };
  return { points, cents: steps * stepCents };
}

// Credits a paid store order once. Safe to call repeatedly (event keys are unique).
export async function creditOrder(sql, intent) {
  if (!cashEnabled() || intent?.status !== 'succeeded' || intent.metadata?.source !== 'lash-cartel-site' || !intent.metadata?.order_id) return null;
  const rows = await sql`SELECT * FROM orders WHERE id = ${Number(intent.metadata.order_id)} AND payment_intent_id = ${intent.id}`;
  if (!rows.length || rows[0].status === 'refunded') return null;
  const order = rows[0];
  const memberId = intent.metadata.member_id ? Number(intent.metadata.member_id) : await memberForEmail(sql, order.customer_email);
  const config = await rewardConfig(sql);
  const used = Number(intent.metadata.points_redeemed || 0);
  if (used > 0) await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) VALUES (${memberId},${-used},${`Used on order ${order.order_number}`},${`order:${order.id}:redeem`}) ON CONFLICT(event_key) DO NOTHING`;
  const earned = purchasePoints(order.subtotal_cents, order.discount_cents, { pointsPerDollar: config.points_per_dollar });
  if (earned > 0) await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) VALUES (${memberId},${earned},${`Order ${order.order_number}`},${`order:${order.id}:earn`}) ON CONFLICT(event_key) DO NOTHING`;
  return { memberId, earned, used, balance: await balanceOf(sql, memberId), orderNumber: order.order_number };
}

// Refund: take back earned points and give back any points the customer spent.
export async function reverseOrder(sql, order) {
  const earn = await sql`SELECT member_id,points FROM points_ledger WHERE event_key = ${`order:${order.id}:earn`}`;
  if (earn.length) await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) VALUES (${earn[0].member_id},${-earn[0].points},${`Refund ${order.order_number}`},${`order:${order.id}:refund`}) ON CONFLICT(event_key) DO NOTHING`;
  const spent = await sql`SELECT member_id,points FROM points_ledger WHERE event_key = ${`order:${order.id}:redeem`}`;
  if (spent.length) await sql`INSERT INTO points_ledger(member_id,points,reason,event_key) VALUES (${spent[0].member_id},${-spent[0].points},${`Points returned for refund ${order.order_number}`},${`order:${order.id}:redeem-back`}) ON CONFLICT(event_key) DO NOTHING`;
}
