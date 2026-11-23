-- Lash Cartel: full database setup. Paste all of this into Vercel > Storage > your database > Query, then Run. Safe to run more than once.

-- ===== db/migrations/001_partner.sql =====
CREATE TABLE IF NOT EXISTS enquiries (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('stockist','host','rental')),
  name TEXT NOT NULL,
  business TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  rental_period TEXT,
  intended_placement TEXT,
  message TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiries_rate_idx ON enquiries(ip_hash, created_at);
CREATE TABLE IF NOT EXISTS faq_unmatched (
  day DATE PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- ===== db/migrations/002_stock.sql =====
CREATE TABLE IF NOT EXISTS stock_status (
  product_key TEXT PRIMARY KEY,
  in_stock BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO stock_status (product_key, in_stock) VALUES
  ('diy-volume', true), ('diy-natural', true), ('pretty-ambition', false), ('mascara', true)
ON CONFLICT (product_key) DO NOTHING;
CREATE TABLE IF NOT EXISTS stock_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  product_key TEXT NOT NULL REFERENCES stock_status(product_key),
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_key, email)
);

-- ===== db/migrations/003_orders.sql =====
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,
  payment_intent_id TEXT UNIQUE,
  customer_email TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  free_gift TEXT NOT NULL,
  shipping_address JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_sent_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  tracking_number TEXT,
  tracking_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_log (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, reference_id)
);

-- ===== db/migrations/004_admin.sql =====
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_login_rate_idx ON admin_login_attempts(ip_hash, created_at);

-- ===== db/migrations/005_carts.sql =====
CREATE TABLE IF NOT EXISTS carts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT false,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purchased_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS carts_due_idx ON carts(updated_at) WHERE consent = true AND purchased_at IS NULL AND unsubscribed_at IS NULL;

-- ===== db/migrations/006_rewards.sql =====
CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS member_magic_links (
  token_hash TEXT PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_magic_rate_idx ON member_magic_links(member_id, created_at);
CREATE TABLE IF NOT EXISTS points_ledger (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id),
  points INTEGER NOT NULL CHECK (points <> 0),
  reason TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_member_idx ON points_ledger(member_id, created_at DESC);
CREATE TABLE IF NOT EXISTS reward_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  join_points INTEGER NOT NULL DEFAULT 10,
  points_per_dollar INTEGER NOT NULL DEFAULT 1,
  rating_points INTEGER NOT NULL DEFAULT 5,
  written_review_points INTEGER NOT NULL DEFAULT 5,
  approved_photo_points INTEGER NOT NULL DEFAULT 5,
  redemption_step_points INTEGER NOT NULL DEFAULT 100,
  redemption_step_cents INTEGER NOT NULL DEFAULT 500,
  minimum_redemption_points INTEGER NOT NULL DEFAULT 100,
  max_discount_cents INTEGER,
  allow_full_cover BOOLEAN NOT NULL DEFAULT FALSE,
  expiry_days INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO reward_config(id) VALUES (TRUE) ON CONFLICT(id) DO NOTHING;

-- ===== db/migrations/007_giveaway.sql =====
-- November Giveaway: one row per ticket number that is held (mid-checkout), sold or refunded.
-- A number with no row, or with an expired hold, is available.
CREATE TABLE IF NOT EXISTS giveaway_tickets (
  number INTEGER PRIMARY KEY CHECK (number BETWEEN 1 AND 1000),
  status TEXT NOT NULL CHECK (status IN ('held', 'sold', 'refunded')),
  hold_id TEXT,
  hold_expires TIMESTAMPTZ,
  payment_ref TEXT,            -- Stripe PaymentIntent id, or order:<id> for a free kit ticket
  source TEXT NOT NULL CHECK (source IN ('paid', 'kit')),
  name TEXT,
  email TEXT,
  phone TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS giveaway_tickets_payment_ref ON giveaway_tickets (payment_ref);
CREATE INDEX IF NOT EXISTS giveaway_tickets_hold_id ON giveaway_tickets (hold_id);

-- The live draw: written once by the owner from /admin. Winners are 3rd, 2nd, 1st prize in that order.
CREATE TABLE IF NOT EXISTS giveaway_draw (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  winners INTEGER[] NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
