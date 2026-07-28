-- Prod Wave 6: tariff columns + digest_jobs queue schema alignment

ALTER TABLE tariff_rules
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE tariff_rules
  ADD COLUMN IF NOT EXISTS customs_fee_mxn NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE digest_jobs
  ADD COLUMN IF NOT EXISTS locale TEXT;

ALTER TABLE digest_jobs
  ADD COLUMN IF NOT EXISTS digest_date TEXT;

ALTER TABLE digest_jobs
  ADD COLUMN IF NOT EXISTS channels_json JSONB;

ALTER TABLE digest_jobs
  ADD COLUMN IF NOT EXISTS simulate_poison BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE digest_jobs
  ADD COLUMN IF NOT EXISTS result_json JSONB;

ALTER TABLE digest_jobs DROP CONSTRAINT IF EXISTS digest_jobs_status_check;

ALTER TABLE digest_jobs
  ADD CONSTRAINT digest_jobs_status_check
  CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'dead_letter', 'sent'));
