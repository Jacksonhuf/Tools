-- SDD §5.6 Adjustment batches
CREATE TABLE IF NOT EXISTS adjustment_batches (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'pending_approval', 'approved', 'applied')
  ),
  reason_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS adjustment_items (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES adjustment_batches (id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  explicit_price_mxn NUMERIC(14, 2) NOT NULL,
  from_price_mxn NUMERIC(14, 2),
  guard_result TEXT,
  to_version_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_adj_batches_tenant ON adjustment_batches (tenant_id);
