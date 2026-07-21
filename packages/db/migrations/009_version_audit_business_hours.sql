-- SDD §5.5 version audit (TC-INT-VER-003) + P3-E1-02 business hours flag
ALTER TABLE price_versions
  ADD COLUMN IF NOT EXISTS trigger_event_id TEXT,
  ADD COLUMN IF NOT EXISTS dynamic_rule_id TEXT,
  ADD COLUMN IF NOT EXISTS competitor_snapshot_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS floor_snapshot_id TEXT,
  ADD COLUMN IF NOT EXISTS cost_snapshot_id TEXT;

ALTER TABLE dynamic_repricing_rules
  ADD COLUMN IF NOT EXISTS business_hours_only BOOLEAN NOT NULL DEFAULT FALSE;
