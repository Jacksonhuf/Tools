-- SDD §5.1 shops + §4 shop_credentials (MVP)
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('MERCADO_LIBRE', 'AMAZON_MX')),
  name TEXT NOT NULL,
  external_seller_id TEXT,
  auth_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (auth_status IN ('disconnected', 'connected', 'expired')),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_tenant ON shops (tenant_id);

CREATE TABLE IF NOT EXISTS shop_credentials (
  shop_id TEXT PRIMARY KEY REFERENCES shops (id) ON DELETE CASCADE,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
