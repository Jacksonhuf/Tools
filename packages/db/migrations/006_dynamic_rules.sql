-- SDD §5.6 dynamic_repricing_rules + listing stale flag
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS competitor_stale_frozen BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS competitor_stale_since TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS dynamic_repricing_rules (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL UNIQUE REFERENCES listings (id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  action TEXT NOT NULL DEFAULT 'suggest'
    CHECK (action IN ('suggest', 'pending', 'auto_active')),
  anchor_type TEXT NOT NULL DEFAULT 'median',
  offset_json JSONB NOT NULL DEFAULT '{"type":"PERCENT","value":0}',
  triggers_json JSONB,
  cooldown_min INT NOT NULL DEFAULT 0,
  daily_limit INT NOT NULL DEFAULT 10,
  min_gap_mxn NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tier TEXT,
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
