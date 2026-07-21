-- SDD §5.1 / §5.3 / §5.5 (MVP)
CREATE TABLE IF NOT EXISTS skus (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  name TEXT NOT NULL,
  landed_cost_mxn NUMERIC(14, 2) NOT NULL,
  policy_json JSONB NOT NULL,
  fee_ml_json JSONB NOT NULL,
  fee_amazon_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skus_tenant ON skus (tenant_id);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku_id TEXT NOT NULL REFERENCES skus (id),
  channel TEXT NOT NULL,
  UNIQUE (sku_id, channel)
);

CREATE TABLE IF NOT EXISTS price_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku_id TEXT NOT NULL REFERENCES skus (id),
  channel TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('suggested', 'pending', 'active', 'superseded')),
  publish_price_mxn NUMERIC(14, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versions_sku ON price_versions (sku_id, channel, state);
