-- Production persistence: idempotency, publish status, cost/fx/tariff, ops stores

ALTER TABLE price_versions
  ADD COLUMN IF NOT EXISTS channel_publish_status TEXT;

CREATE TABLE IF NOT EXISTS publish_idempotency (
  composite_key TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  outcome_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_idempotency_tenant
  ON publish_idempotency (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cost_sheets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku_id TEXT NOT NULL REFERENCES skus (id),
  batch_no TEXT NOT NULL,
  cogs_amount NUMERIC(14, 4) NOT NULL,
  cogs_currency TEXT NOT NULL DEFAULT 'USD',
  freight_alloc_mxn NUMERIC(14, 2) NOT NULL DEFAULT 0,
  freight_alloc_rule TEXT NOT NULL DEFAULT 'PER_UNIT',
  effective_from TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_sheets_sku
  ON cost_sheets (tenant_id, sku_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS fx_rates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL DEFAULT 'MXN',
  rate NUMERIC(18, 8) NOT NULL,
  buffer_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_tenant
  ON fx_rates (tenant_id, base_currency, valid_from DESC);

CREATE TABLE IF NOT EXISTS tariff_rules (
  hs_code TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  duty_rate NUMERIC(8, 4) NOT NULL,
  notes TEXT,
  PRIMARY KEY (tenant_id, hs_code)
);

CREATE TABLE IF NOT EXISTS digest_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'sent', 'dead_letter')),
  payload_json JSONB NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_jobs_status
  ON digest_jobs (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  tenant_id TEXT,
  reported_at TIMESTAMPTZ NOT NULL,
  details_json JSONB
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  diff_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant
  ON audit_logs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reconciliation_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  active_price_mxn NUMERIC(14, 2) NOT NULL,
  channel_price_mxn NUMERIC(14, 2) NOT NULL,
  delta_mxn NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_alerts_tenant
  ON reconciliation_alerts (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS export_files (
  export_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_type TEXT NOT NULL,
  storage_key TEXT,
  body_text TEXT,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_export_files_tenant
  ON export_files (tenant_id, expires_at);
