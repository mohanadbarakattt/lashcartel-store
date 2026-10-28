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
