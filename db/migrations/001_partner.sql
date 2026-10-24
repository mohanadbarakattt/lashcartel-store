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
