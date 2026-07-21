-- SDD §5.4 competitor offers and observations
CREATE TABLE IF NOT EXISTS competitor_offers (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_ref TEXT NOT NULL,
  seller_id TEXT,
  label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_offers_listing
  ON competitor_offers (listing_id);

CREATE TABLE IF NOT EXISTS price_observations (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES competitor_offers (id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  list_price NUMERIC(14, 2),
  sale_price NUMERIC(14, 2),
  shipping_addon NUMERIC(14, 2) NOT NULL DEFAULT 0,
  effective_price NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  raw_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_price_obs_offer_time
  ON price_observations (offer_id, observed_at DESC);
