ALTER TABLE repricing_batch_jobs
  ADD COLUMN IF NOT EXISTS lease_holder TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_repricing_batch_jobs_lease
  ON repricing_batch_jobs (tenant_id, status, lease_expires_at);
