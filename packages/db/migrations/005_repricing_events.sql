-- SDD §8.1 ingest schedule + §8.3 repricing_events
CREATE TABLE IF NOT EXISTS listing_ingest_schedules (
  listing_id TEXT PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'T1' CHECK (tier IN ('T0', 'T1', 'T2')),
  next_run_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repricing_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  listing_id TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'skipped')),
  payload_json JSONB NOT NULL,
  dedupe_key TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_repricing_events_dedupe
  ON repricing_events (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repricing_events_listing
  ON repricing_events (listing_id, created_at DESC);
