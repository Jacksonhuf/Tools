CREATE TABLE IF NOT EXISTS repricing_batch_jobs (
  job_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('tenant', 'sku')),
  sku_id TEXT,
  shard_total INT NOT NULL,
  sku_ids_json JSONB,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error TEXT,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repricing_batch_jobs_tenant_status
  ON repricing_batch_jobs (tenant_id, status, created_at);
