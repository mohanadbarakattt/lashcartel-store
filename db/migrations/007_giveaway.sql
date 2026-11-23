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
