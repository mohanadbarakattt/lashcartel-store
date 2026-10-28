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
