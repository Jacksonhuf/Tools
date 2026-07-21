-- P3-E1 auto_pending + ingest failure guard (TC-NFR-REL-003)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS ingest_failed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS ingest_failed_at TIMESTAMPTZ;

ALTER TABLE dynamic_repricing_rules
  DROP CONSTRAINT IF EXISTS dynamic_repricing_rules_action_check;

ALTER TABLE dynamic_repricing_rules
  ADD CONSTRAINT dynamic_repricing_rules_action_check
  CHECK (action IN ('suggest', 'pending', 'auto_pending', 'auto_active'));
