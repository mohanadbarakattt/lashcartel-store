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
