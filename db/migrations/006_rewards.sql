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
