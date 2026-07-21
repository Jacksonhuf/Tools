-- P3 Guard: repricing apply audit per listing (cooldown / daily limit)
CREATE TABLE IF NOT EXISTS repricing_activity (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repricing_activity_listing_time
  ON repricing_activity (listing_id, created_at DESC);
