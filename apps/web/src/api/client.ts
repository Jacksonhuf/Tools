const DEMO_SKU = "demo-sku-001";

const LISTING_BY_CHANNEL = {
  MERCADO_LIBRE: "listing-ml-001",
  AMAZON_MX: "listing-amz-001",
} as const;

const AUTH = "dev-token";
const TENANT = "tenant-demo";

export type Channel = keyof typeof LISTING_BY_CHANNEL;

function headers(locale: string): HeadersInit {
  return {
    Authorization: `Bearer ${AUTH}`,
    "X-Tenant-Id": TENANT,
    "Accept-Language": locale,
    "Content-Type": "application/json",
  };
}

export async function fetchSkus(locale: string) {
  const res = await fetch(`/api/v1/skus`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`skus ${res.status}`);
  return res.json() as Promise<{
    items: Array<{
      id: string;
      sku_code: string;
      name: string;
      landed_cost_mxn: number;
    }>;
  }>;
}

export async function patchSkuLandedCost(
  locale: string,
  skuId: string,
  landed_cost_mxn: number
) {
  const res = await fetch(`/api/v1/skus/${skuId}`, {
    method: "PATCH",
    headers: headers(locale),
    body: JSON.stringify({ landed_cost_mxn }),
  });
  if (!res.ok) throw new Error(`patch sku ${res.status}`);
  return res.json();
}

export async function fetchPricingContext(locale: string, channel: Channel) {
  const res = await fetch(
    `/api/v1/skus/${DEMO_SKU}/pricing-context?channel=${channel}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`context ${res.status}`);
  return res.json();
}

export async function simulatePricing(
  locale: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`/api/v1/skus/${DEMO_SKU}/pricing/simulate`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`simulate ${res.status}`);
  return res.json();
}

export async function publishPrice(
  locale: string,
  channel: Channel,
  explicit_price_mxn: number
) {
  const listingId = LISTING_BY_CHANNEL[channel];
  const res = await fetch(`/api/v1/listings/${listingId}/price-versions`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ explicit_price_mxn, reason: "web-ui" }),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export type ChannelPublishResult =
  | {
      publish_status: "published";
      channel_price_mxn: number;
      version_id: string;
      retried?: boolean;
      channel: Channel;
    }
  | {
      publish_status: "failed";
      error_code: string;
      rule_frozen?: boolean;
    };

export async function publishChannelPrice(
  locale: string,
  channel: Channel,
  body: {
    explicit_price_mxn?: number;
    retry_on_step?: boolean;
  } = {}
) {
  const listingId = LISTING_BY_CHANNEL[channel];
  const res = await fetch(`/api/v1/listings/${listingId}/channel-publish`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ChannelPublishResult;
  return { ok: res.ok, status: res.status, json };
}

export async function publishShopChannelPrice(
  locale: string,
  shopId: string,
  body: { retry_on_step?: boolean } = {}
) {
  const res = await fetch(`/api/v1/shops/${shopId}/channel-publish`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ChannelPublishResult;
  return { ok: res.ok, status: res.status, json };
}

export type AdjustmentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "applied";

export interface AdjustmentBatchItem {
  id: string;
  batch_id: string;
  listing_id: string;
  explicit_price_mxn: number;
  from_price_mxn: number | null;
  guard_result: string | null;
  to_version_id: string | null;
}

export interface AdjustmentBatch {
  id: string;
  tenant_id: string;
  status: AdjustmentStatus;
  reason_code: string | null;
  created_at: string;
  approved_at: string | null;
  applied_at: string | null;
  items: AdjustmentBatchItem[];
}

export async function fetchAdjustmentBatches(locale: string) {
  const res = await fetch(`/api/v1/adjustment-batches`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`adjustment-batches ${res.status}`);
  return res.json() as Promise<{ items: AdjustmentBatch[] }>;
}

export async function createAdjustmentBatch(
  locale: string,
  body: {
    reason_code?: string;
    items: Array<{ listing_id: string; explicit_price_mxn: number }>;
  }
) {
  const res = await fetch(`/api/v1/adjustment-batches`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "error" in json
        ? String((json as { error: string }).error)
        : `create batch ${res.status}`
    );
  }
  return json as AdjustmentBatch;
}

export async function approveAdjustmentBatch(locale: string, batchId: string) {
  const res = await fetch(
    `/api/v1/adjustment-batches/${batchId}/approve`,
    { method: "POST", headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`approve batch ${res.status}`);
  return res.json() as Promise<AdjustmentBatch>;
}

export async function applyAdjustmentBatch(locale: string, batchId: string) {
  const res = await fetch(`/api/v1/adjustment-batches/${batchId}/apply`, {
    method: "POST",
    headers: headers(locale),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "error" in json
        ? String((json as { error: string }).error)
        : `apply batch ${res.status}`
    );
  }
  return json as { batch: AdjustmentBatch; version_ids: string[] };
}

export type ShopAuthStatus = "disconnected" | "connected" | "expired";

export interface ShopSummary {
  id: string;
  channel: Channel;
  name: string;
  external_seller_id: string | null;
  auth_status: ShopAuthStatus;
  token_expires_at: string | null;
  created_at: string;
}

export async function fetchShops(locale: string) {
  const res = await fetch(`/api/v1/shops`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`shops ${res.status}`);
  return res.json() as Promise<{ items: ShopSummary[] }>;
}

export async function startShopOAuth(locale: string, shopId: string) {
  const res = await fetch(`/api/v1/shops/${shopId}/oauth/start`, {
    method: "POST",
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`oauth start ${res.status}`);
  return res.json() as Promise<{
    state: string;
    authorization_url: string;
    channel: Channel;
  }>;
}

export async function mockCompleteShopOAuth(
  locale: string,
  shopId: string,
  state?: string
) {
  const res = await fetch(`/api/v1/shops/${shopId}/oauth/mock-complete`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(state ? { state } : {}),
  });
  if (!res.ok) throw new Error(`oauth complete ${res.status}`);
  return res.json() as Promise<{ shop: ShopSummary }>;
}

export async function pullShopListing(
  locale: string,
  shopId: string,
  external_ref: string
) {
  const res = await fetch(`/api/v1/shops/${shopId}/listings/pull`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ external_ref }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "error" in json
        ? String((json as { error: string }).error)
        : `pull listing ${res.status}`
    );
  }
  return json as {
    snapshot: {
      external_item_id: string;
      external_asin?: string;
      price_mxn: number;
    };
  };
}

export interface CompetitorOfferRow {
  id: string;
  listing_id: string;
  channel: Channel;
  external_ref: string;
  label: string | null;
  is_primary: boolean;
  latest_effective_mxn: number | null;
  latest_observed_at?: string | null;
}

export async function fetchCompetitorOffers(locale: string, listingId: string) {
  const res = await fetch(`/api/v1/listings/${listingId}/competitors`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`competitors ${res.status}`);
  return res.json() as Promise<{
    items: CompetitorOfferRow[];
    anchor: {
      count: number;
      min_mxn: number | null;
      median_mxn: number | null;
      primary_mxn: number | null;
    };
  }>;
}

export async function createCompetitorOffer(
  locale: string,
  listingId: string,
  body: {
    external_ref: string;
    label?: string;
    seller_id?: string;
    is_primary?: boolean;
  }
) {
  const res = await fetch(`/api/v1/listings/${listingId}/competitors`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create competitor ${res.status}`);
  return res.json();
}

export async function addCompetitorObservation(
  locale: string,
  offerId: string,
  body: {
    list_price?: number;
    sale_price?: number;
    shipping_addon?: number;
    include_shipping?: boolean;
    source?: string;
  }
) {
  const res = await fetch(`/api/v1/competitor-offers/${offerId}/observations`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`observation ${res.status}`);
  return res.json();
}

export async function fetchPriceHistory(
  locale: string,
  listingId: string,
  range: "7d" | "30d" = "7d"
) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/price-history?range=${range}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`price-history ${res.status}`);
  return res.json() as Promise<{
    observations: Array<{ effective_price: number; observed_at: string }>;
  }>;
}

export async function fetchIngestStatus(locale: string, listingId: string) {
  const res = await fetch(`/api/v1/listings/${listingId}/ingest/status`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`ingest status ${res.status}`);
  return res.json() as Promise<{
    tier: string;
    next_run_at: string;
    interval_ms: number;
    ingest_failed?: boolean;
    ingest_failed_at?: string | null;
  }>;
}

export async function runIngest(locale: string, listingId: string) {
  const res = await fetch(`/api/v1/listings/${listingId}/ingest/run`, {
    method: "POST",
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`ingest run ${res.status}`);
  return res.json() as Promise<{
    observations_created: number;
    tier: string;
  }>;
}

export async function fetchDynamicRule(locale: string, listingId: string) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/dynamic-repricing-rule`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`dynamic rule ${res.status}`);
  return res.json() as Promise<{
    rule: {
      enabled: boolean;
      frozen: boolean;
      anchor_type: string;
      min_gap_mxn: number;
    };
    stale: { competitor_stale_frozen: boolean };
  }>;
}

export async function updateDynamicRule(
  locale: string,
  listingId: string,
  body: Record<string, unknown>
) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/dynamic-repricing-rule`,
    {
      method: "PUT",
      headers: headers(locale),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`update rule ${res.status}`);
  return res.json();
}

export async function unfreezeDynamicRule(locale: string, listingId: string) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/dynamic-repricing-rule/unfreeze`,
    { method: "POST", headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`unfreeze ${res.status}`);
  return res.json();
}

export async function checkCompetitorStale(locale: string, listingId: string) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/competitors/stale-check`,
    { method: "POST", headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`stale-check ${res.status}`);
  return res.json() as Promise<{ stale: boolean }>;
}

export async function flushRepricingEvents(locale: string, listingId: string) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/repricing-events/flush`,
    { method: "POST", headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`flush ${res.status}`);
  return res.json() as Promise<{
    event: { id: string; type: string } | null;
  }>;
}

export async function processRepricingEvent(locale: string, eventId: string) {
  const res = await fetch(`/api/v1/repricing-events/${eventId}/process`, {
    method: "POST",
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`process event ${res.status}`);
  return res.json() as Promise<{ version_id?: string; state?: string }>;
}

export interface RepricingQueueItem {
  version_id: string;
  listing_id: string;
  channel: Channel;
  state: "suggested" | "pending";
  publish_price_mxn: number;
  created_at: string;
}

export async function fetchRepricingQueue(locale: string, skuId: string) {
  const res = await fetch(`/api/v1/skus/${skuId}/repricing-queue`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`repricing-queue ${res.status}`);
  return res.json() as Promise<{ items: RepricingQueueItem[] }>;
}

export async function promoteRepricingToPending(
  locale: string,
  versionIds: string[]
) {
  const res = await fetch(`/api/v1/repricing-queue/promote-pending`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ version_ids: versionIds }),
  });
  if (!res.ok) throw new Error(`promote pending ${res.status}`);
  return res.json() as Promise<{
    updated: RepricingQueueItem[];
    skipped: string[];
  }>;
}

export type BatchChannelPublishResult = {
  publish_status: "all_published" | "partial_success" | "all_failed";
  items: Array<{
    listing_id: string;
    channel: Channel;
    publish_status: "published" | "failed" | "skipped";
    channel_price_mxn?: number;
    error_code?: string;
  }>;
};

export async function batchChannelPublish(
  locale: string,
  listingIds: string[],
  options?: { idempotency_key?: string }
) {
  const res = await fetch(`/api/v1/channel-publish/batch`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({
      listing_ids: listingIds,
      retry_on_step: true,
      idempotency_key: options?.idempotency_key,
    }),
  });
  const json = (await res.json()) as BatchChannelPublishResult;
  return { ok: res.ok, status: res.status, json };
}

export interface ReconciliationAlert {
  id: string;
  listing_id: string;
  channel: Channel;
  active_price_mxn: number;
  channel_price_mxn: number;
  delta_mxn: number;
  severity: string;
  created_at: string;
}

export async function fetchReconciliationAlerts(locale: string) {
  const res = await fetch(`/api/v1/reconciliation-alerts`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`reconciliation-alerts ${res.status}`);
  return res.json() as Promise<{ items: ReconciliationAlert[] }>;
}

export async function reconcileListing(
  locale: string,
  listingId: string,
  external_ref: string
) {
  const res = await fetch(`/api/v1/listings/${listingId}/reconcile`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ external_ref }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "error" in json
        ? String((json as { error: string }).error)
        : `reconcile ${res.status}`
    );
  }
  return json as
    | { status: "ok"; active_price_mxn: number; channel_price_mxn: number }
    | {
        status: "mismatch";
        active_price_mxn: number;
        channel_price_mxn: number;
        delta_mxn: number;
        alert_id: string;
      };
}

export { DEMO_SKU, LISTING_BY_CHANNEL };
