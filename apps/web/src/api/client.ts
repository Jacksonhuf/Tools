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

export async function downloadSkusCatalogCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/skus/export`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`skus-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "skus-catalog.csv";
  a.click();
  URL.revokeObjectURL(url);
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

export async function patchSkuPolicy(
  locale: string,
  skuId: string,
  body: {
    target_margin_pct?: number;
    min_margin_pct?: number;
    pricing_mode?: "cost" | "competitive" | "competitive_with_floor";
  }
) {
  const res = await fetch(`/api/v1/skus/${encodeURIComponent(skuId)}/policy`, {
    method: "PATCH",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch policy ${res.status}`);
  return res.json() as Promise<{
    id: string;
    policy: {
      target_margin_pct: number;
      min_margin_pct: number;
      pricing_mode: string;
    };
  }>;
}

export async function batchPatchSkuPolicies(
  locale: string,
  items: Array<{
    sku_id: string;
    target_margin_pct?: number;
    min_margin_pct?: number;
    pricing_mode?: "cost" | "competitive" | "competitive_with_floor";
  }>
) {
  const res = await fetch(`/api/v1/skus/policy/batch`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`sku-policy-batch ${res.status}`);
  return res.json() as Promise<{
    updated: Array<{ sku_id: string }>;
    errors: Array<{ sku_id: string; error: string }>;
  }>;
}

export async function fetchSharedFeeTemplates(locale: string) {
  const res = await fetch(`/api/v1/tenants/tenant-demo/shared-fee-templates`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`shared-fee-templates ${res.status}`);
  return res.json() as Promise<{
    items: Array<{ id: string; name: string; channel: string }>;
  }>;
}

export async function fetchCategoryRuleTemplates(locale: string) {
  const res = await fetch(`/api/v1/category-rule-templates`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`category-rule-templates ${res.status}`);
  return res.json() as Promise<{
    items: Array<{ category_id: string; name: string }>;
  }>;
}

export async function downloadCategoryRuleTemplatesCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/category-rule-templates/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`category-rule-templates-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "category-rule-templates.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadSharedFeeTemplatesCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/shared-fee-templates/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`shared-fee-templates-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shared-fee-templates.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCompetitorOffersCsv(
  locale: string,
  listingId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/competitors/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`competitor-offers-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `competitor-offers-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadOpsMetricsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/ops/metrics/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`ops-metrics-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ops-metrics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function applySharedFeeTemplate(
  locale: string,
  skuId: string,
  templateId: string
) {
  const res = await fetch(
    `/api/v1/skus/${encodeURIComponent(skuId)}/apply-shared-fee-template`,
    {
      method: "POST",
      headers: headers(locale),
      body: JSON.stringify({ template_id: templateId }),
    }
  );
  if (!res.ok) throw new Error(`apply-fee-template ${res.status}`);
  return res.json();
}

export async function syncListingChannel(
  locale: string,
  listingId: string,
  external_ref: string
) {
  const res = await fetch(`/api/v1/listings/${listingId}/sync`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ external_ref }),
  });
  if (!res.ok) throw new Error(`listing-sync ${res.status}`);
  return res.json() as Promise<{
    job: { id: string; status: string };
    snapshot: { price_mxn: number };
  }>;
}

export async function importCostSheetsCsv(locale: string, csv: string) {
  const res = await fetch(`/api/v1/imports/cost-sheets`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ csv }),
  });
  if (!res.ok) throw new Error(`cost-sheets-import ${res.status}`);
  return res.json() as Promise<{
    parse_errors: string[];
    created: Array<{ sku_id: string; cost_sheet_id: string }>;
    skipped: unknown[];
  }>;
}

export interface CostSheetRow {
  id: string;
  batch_no: string;
  cogs_amount: number;
  cogs_currency: string;
  freight_alloc_mxn: number;
  freight_alloc_rule: string;
  effective_from: string;
}

export async function fetchCostSheets(locale: string, skuId: string) {
  const res = await fetch(`/api/v1/skus/${encodeURIComponent(skuId)}/cost-sheets`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`cost-sheets ${res.status}`);
  return res.json() as Promise<{ items: CostSheetRow[] }>;
}

export async function createCostSheetRow(
  locale: string,
  skuId: string,
  body: {
    batch_no: string;
    cogs_amount: number;
    cogs_currency?: string;
    freight_alloc_mxn?: number;
    freight_alloc_rule?: "PER_UNIT" | "WEIGHT_BASED";
  }
) {
  const res = await fetch(`/api/v1/skus/${encodeURIComponent(skuId)}/cost-sheets`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create cost-sheet ${res.status}`);
  return res.json() as Promise<CostSheetRow>;
}

export async function applyLandedFromCostSheet(
  locale: string,
  skuId: string,
  cost_sheet_id: string
) {
  const res = await fetch(
    `/api/v1/skus/${encodeURIComponent(skuId)}/landed-cost/from-cost-sheet`,
    {
      method: "POST",
      headers: headers(locale),
      body: JSON.stringify({ cost_sheet_id, apply: true }),
    }
  );
  if (!res.ok) throw new Error(`landed-from-cost-sheet ${res.status}`);
  return res.json() as Promise<{
    computed: { landed_cost_mxn: number };
    sku: { landed_cost_mxn: number };
  }>;
}

export async function fetchPricingContext(locale: string, channel: Channel) {
  const res = await fetch(
    `/api/v1/skus/${DEMO_SKU}/pricing-context?channel=${channel}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`context ${res.status}`);
  return res.json();
}

export interface CrossChannelGuardResponse {
  mercado_libre_active_mxn: number | null;
  amazon_mx_active_mxn: number | null;
  warning: {
    code: string;
    spread_pct: number;
    max_spread_pct: number;
    mercado_libre_price_mxn: number;
    amazon_mx_price_mxn: number;
  } | null;
}

export async function fetchCrossChannelGuard(locale: string) {
  const res = await fetch(`/api/v1/skus/${DEMO_SKU}/cross-channel-guard`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`cross-channel-guard ${res.status}`);
  return res.json() as Promise<CrossChannelGuardResponse>;
}

export async function downloadCrossChannelGuardCsv(
  locale: string,
  skuId = DEMO_SKU
): Promise<void> {
  const res = await fetch(
    `/api/v1/skus/${encodeURIComponent(skuId)}/cross-channel-guard/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`cross-channel-guard-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cross-channel-guard-${skuId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

export async function downloadAdjustmentApprovalPolicyCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/adjustment-batches/approval-policy/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`adjustment-approval-policy-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "adjustment-approval-policy.csv";
  a.click();
  URL.revokeObjectURL(url);
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

export async function fetchChannelSandboxStatus(locale: string) {
  const res = await fetch(`/api/v1/channels/sandbox/status`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`sandbox status ${res.status}`);
  return res.json() as Promise<{
    enabled: boolean;
    mode: string;
    note: string;
  }>;
}

export async function downloadChannelSandboxStatusCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/channels/sandbox/status/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`channel-sandbox-status-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "channel-sandbox-status.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export interface ChannelSandboxEvent {
  id: string;
  tenant_id: string;
  listing_id: string;
  channel: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function fetchChannelSandboxEvents(locale: string, limit = 20) {
  const res = await fetch(
    `/api/v1/channels/sandbox/events?limit=${encodeURIComponent(String(limit))}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`sandbox events ${res.status}`);
  return res.json() as Promise<{ items: ChannelSandboxEvent[] }>;
}

export async function downloadChannelSandboxEventsCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/channels/sandbox/events/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`sandbox-events-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "channel-sandbox-events.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export interface ChannelAdapterStatus {
  driver: string;
  publish_http_url_configured: boolean;
  listing_pull_http_url_configured: boolean;
  ready: boolean;
  note: string;
}

export async function fetchChannelAdapterStatus(locale: string) {
  const res = await fetch(`/api/v1/channels/adapters/status`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`adapter status ${res.status}`);
  return res.json() as Promise<ChannelAdapterStatus>;
}

export async function downloadChannelAdapterStatusCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/channels/adapters/status/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`channel-adapters-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "channel-adapters-status.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchShops(locale: string) {
  const res = await fetch(`/api/v1/shops`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`shops ${res.status}`);
  return res.json() as Promise<{ items: ShopSummary[] }>;
}

export async function downloadShopsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/shops/export`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`shops-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shops.csv";
  a.click();
  URL.revokeObjectURL(url);
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
      buy_box_mxn: number | null;
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
    buy_box_winner?: boolean;
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

export async function downloadPriceHistoryCsv(
  locale: string,
  listingId: string,
  range: "7d" | "30d" = "7d"
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/price-history/export?range=${range}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`price-history-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `price-history-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadRepricingEventsCsv(
  locale: string,
  listingId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/repricing-events/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`repricing-events-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `repricing-events-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAdjustmentBatchesIndexCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/adjustment-batches/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`adjustment-batches-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "adjustment-batches-index.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchCompetitorCurve(
  locale: string,
  listingId: string,
  range: "7d" | "30d" = "7d"
) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/competitors/curve?range=${range}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`competitor-curve ${res.status}`);
  return res.json() as Promise<{
    points: Array<{ date: string; avg_effective_mxn: number }>;
  }>;
}

export async function downloadWaterfallExportCsv(
  locale: string,
  body: {
    channel: Channel;
    pricing_mode: string;
    target_margin_pct?: number;
    competitor_price_mxn?: number;
  }
): Promise<void> {
  const post = await fetch(`/api/v1/exports`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ kind: "waterfall_csv", ...body }),
  });
  if (!post.ok) throw new Error(`waterfall-export ${post.status}`);
  const meta = (await post.json()) as { download_path: string };
  const dl = await fetch(meta.download_path, { headers: headers(locale) });
  if (!dl.ok) throw new Error(`waterfall-download ${dl.status}`);
  const blob = await dl.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "waterfall-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchListingSyncSchedule(locale: string) {
  const res = await fetch(`/api/v1/ops/listing-sync/schedule`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-schedule ${res.status}`);
  return res.json() as Promise<{
    enabled: boolean;
    cron_expression: string;
    last_run_at: string | null;
  }>;
}

export async function downloadListingSyncScheduleCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/ops/listing-sync/schedule/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-schedule-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "listing-sync-schedule.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function updateListingSyncSchedule(
  locale: string,
  body: { enabled?: boolean; cron_expression?: string }
) {
  const res = await fetch(`/api/v1/ops/listing-sync/schedule`, {
    method: "PUT",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`listing-sync-schedule-update ${res.status}`);
  return res.json();
}

export async function runListingSyncDue(locale: string, force = false) {
  const qs = force ? "?force=true" : "";
  const res = await fetch(`/api/v1/ops/listing-sync/run-due${qs}`, {
    method: "POST",
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-run-due ${res.status}`);
  return res.json() as Promise<{
    runs: Array<{ listing_id: string; job: { status: string } }>;
  }>;
}

export type ListingSyncJobRow = {
  id: string;
  listing_id: string;
  status: string;
  channel_price_mxn: number | null;
  finished_at: string;
};

export async function fetchListingSyncJobs(locale: string, limit = 10) {
  const res = await fetch(`/api/v1/ops/listing-sync/jobs?limit=${limit}`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-jobs ${res.status}`);
  return res.json() as Promise<{ items: ListingSyncJobRow[] }>;
}

export async function fetchListingSyncOpsStatus(locale: string) {
  const res = await fetch(`/api/v1/ops/listing-sync/status`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-status ${res.status}`);
  return res.json() as Promise<{
    schedule: { enabled: boolean; last_run_at: string | null };
    job_summary: {
      sampled: number;
      ok: number;
      failed: number;
      last_finished_at: string | null;
    };
  }>;
}

export async function fetchListingSyncJobsForListing(
  locale: string,
  listingId: string
) {
  const res = await fetch(`/api/v1/listings/${listingId}/sync/jobs`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-jobs-listing ${res.status}`);
  return res.json() as Promise<{ items: ListingSyncJobRow[] }>;
}

export async function downloadListingSyncJobsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/ops/listing-sync/jobs/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-jobs-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "listing-sync-jobs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadListingSyncOpsStatusCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/ops/listing-sync/status/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`listing-sync-status-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "listing-sync-ops-status.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadListingSyncJobsForListingCsv(
  locale: string,
  listingId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/sync/jobs/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`listing-sync-jobs-listing-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `listing-sync-jobs-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadReconciliationAlertsDirectCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/reconciliation-alerts/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`reconciliation-alerts-direct ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reconciliation-alerts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadExportCsv(
  locale: string,
  body: Record<string, unknown>,
  filename: string
): Promise<void> {
  const post = await fetch(`/api/v1/exports`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!post.ok) throw new Error(`export ${post.status}`);
  const meta = (await post.json()) as { download_path: string };
  const dl = await fetch(meta.download_path, { headers: headers(locale) });
  if (!dl.ok) throw new Error(`export-download ${dl.status}`);
  const blob = await dl.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCompetitorCurveCsv(
  locale: string,
  listingId: string,
  range: "7d" | "30d" = "7d"
): Promise<void> {
  await downloadExportCsv(
    locale,
    { kind: "competitor_curve_csv", listing_id: listingId, range },
    `competitor-curve-${listingId}.csv`
  );
}

export async function downloadAdjustmentBatchCsv(
  locale: string,
  batchId: string
): Promise<void> {
  await downloadExportCsv(
    locale,
    { kind: "adjustment_batch_csv", batch_id: batchId },
    `adjustment-batch-${batchId}.csv`
  );
}

export async function downloadReconciliationAlertsExport(
  locale: string
): Promise<void> {
  await downloadExportCsv(
    locale,
    { kind: "reconciliation_alerts_csv" },
    "reconciliation-alerts.csv"
  );
}

export async function downloadCompetitorCurveDirect(
  locale: string,
  listingId: string,
  range: "7d" | "30d" = "7d"
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/competitors/curve/export?range=${range}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`competitor-curve-direct ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `competitor-curve-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

export async function downloadDynamicRepricingRuleCsv(
  locale: string,
  listingId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${encodeURIComponent(listingId)}/dynamic-repricing-rule/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`dynamic-repricing-rule-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dynamic-repricing-rule-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

export async function downloadRepricingQueueCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/repricing-queue/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`repricing-queue-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "repricing-queue-tenant.csv";
  a.click();
  URL.revokeObjectURL(url);
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

export interface OpsMetricsSnapshot {
  tenant_id: string;
  catalog_driver: string;
  channel_sandbox: {
    enabled: boolean;
    mode: string;
    event_count: number;
  };
  channel_adapters: {
    driver: string;
    ready: boolean;
    publish_http_url_configured: boolean;
    listing_pull_http_url_configured: boolean;
  };
  digest_queue: { total: number; queued: number; failed: number; dead_letter: number };
  repricing_batch_queue: {
    driver: string;
    total: number;
    queued: number;
    failed: number;
  };
  nfr: {
    pricing_simulate_count: number;
    pricing_calc_duration_ms_avg: number;
    repricing_lag_seconds: number | null;
  };
  generated_at: string;
}

export async function fetchOpsMetrics(locale: string) {
  const res = await fetch(`/api/v1/ops/metrics`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`ops-metrics ${res.status}`);
  return res.json() as Promise<OpsMetricsSnapshot>;
}

export interface CrossChannelDashboardItem {
  sku_id: string;
  sku_code: string;
  name: string;
  mercado_libre_active_mxn: number | null;
  amazon_mx_active_mxn: number | null;
  warning: { code: string; spread_pct: number; max_spread_pct: number } | null;
}

export interface CrossChannelDashboardSnapshot {
  tenant_id: string;
  sku_count: number;
  alert_count: number;
  items: CrossChannelDashboardItem[];
  generated_at: string;
}

export async function fetchCrossChannelDashboard(locale: string) {
  const res = await fetch(`/api/v1/cross-channel/dashboard`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`cross-channel-dashboard ${res.status}`);
  return res.json() as Promise<CrossChannelDashboardSnapshot>;
}

export async function downloadCrossChannelDashboardCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/cross-channel/dashboard/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`cross-channel-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cross-channel-dashboard.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCostSheetsCsv(
  locale: string,
  skuId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/skus/${encodeURIComponent(skuId)}/cost-sheets/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`cost-sheets-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cost-sheets-${skuId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchRepricingBatchJobsSummary(locale: string) {
  const res = await fetch(`/api/v1/repricing-batch/jobs/summary`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`repricing-batch-summary ${res.status}`);
  return res.json() as Promise<{
    driver: string;
    summary: {
      sampled: number;
      queued: number;
      processing: number;
      completed: number;
      failed: number;
    };
    last_job_at: string | null;
  }>;
}

export async function downloadRepricingBatchJobsCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/repricing-batch/jobs/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`repricing-batch-jobs-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "repricing-batch-jobs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadRepricingBatchJobsSummaryCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/repricing-batch/jobs/summary/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`repricing-batch-summary-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "repricing-batch-jobs-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadListingIngestStatusCsv(
  locale: string,
  listingId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/ingest/status/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`listing-ingest-status-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `listing-ingest-status-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadFeatureFlagsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/feature-flags/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`feature-flags-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feature-flags.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAuthStatusCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/auth/status/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`auth-status-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "auth-status.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function importLandedCostCsv(locale: string, csv: string) {
  const res = await fetch(`/api/v1/imports/landed-cost`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ csv }),
  });
  if (!res.ok) throw new Error(`landed-cost-import ${res.status}`);
  return res.json() as Promise<{
    updated: Array<{ sku_id: string; landed_cost_mxn: number }>;
    skipped: unknown[];
    parse_errors: string[];
  }>;
}

export interface TariffHsRow {
  hs_code: string;
  description: string;
  tariff_rate: number;
  customs_fee_mxn: number;
}

export async function fetchTariffHsRates(locale: string) {
  const res = await fetch(`/api/v1/tariff-hs-rates`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`tariff-hs-rates ${res.status}`);
  return res.json() as Promise<{ items: TariffHsRow[] }>;
}

export async function downloadTariffHsRatesCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/tariff-hs-rates/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`tariff-hs-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tariff-hs-rates.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function previewLandedCostFromHs(
  locale: string,
  skuId: string,
  cogs_amount: number
) {
  const res = await fetch(`/api/v1/skus/${encodeURIComponent(skuId)}/landed-cost/from-hs`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ cogs_amount, cogs_currency: "MXN" }),
  });
  if (!res.ok) throw new Error(`landed-cost-from-hs ${res.status}`);
  return res.json() as Promise<{
    computed: { landed_cost_mxn: number; duty_mxn: number };
    hs_code: string;
  }>;
}

export async function previewAdjustmentPricesCsv(locale: string, csv: string) {
  const res = await fetch(`/api/v1/imports/adjustment-prices`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ csv }),
  });
  if (!res.ok) throw new Error(`adjustment-prices-import ${res.status}`);
  return res.json() as Promise<{
    parse_errors: string[];
    preview: {
      status: string;
      approval_triggers: string[];
      items: Array<{ listing_id: string; explicit_price_mxn: number }>;
    };
  }>;
}

export async function applyAdjustmentPricesCsv(
  locale: string,
  csv: string,
  reason_code?: string
) {
  const res = await fetch(`/api/v1/imports/adjustment-prices`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ csv, reason_code, apply: true }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof json === "object" && json && "error" in json
        ? String((json as { error: string }).error)
        : `adjustment-prices-apply ${res.status}`
    );
  }
  return json as {
    parse_errors: string[];
    preview: { status: string };
    batch: AdjustmentBatch;
  };
}

export async function downloadVersionBackup(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/ops/version-backup?format=download`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`version-backup ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "version-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchWorkerStatus(locale: string) {
  const res = await fetch(`/api/v1/ops/workers/status`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`workers-status ${res.status}`);
  return res.json() as Promise<{
    workers: Array<{ worker_id: string; reported_at: string; stale: boolean }>;
    scripts: Record<string, string>;
  }>;
}

export async function downloadPricingSnapshotCsv(
  locale: string,
  skuId = DEMO_SKU
): Promise<void> {
  const res = await fetch(
    `/api/v1/reports/pricing-snapshot/export?sku_id=${encodeURIComponent(skuId)}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`pricing-snapshot-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pricing-snapshot-${skuId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadTenantPricingSnapshotsCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/reports/pricing-snapshots/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`pricing-snapshots-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pricing-snapshots-tenant.csv";
  a.click();
  URL.revokeObjectURL(url);
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

export interface DynamicRuleDraftPayload {
  enabled: boolean;
  action: string;
  anchor_type: string;
  offset: { type: "PERCENT" | "FIXED_MXN"; value: number };
  min_gap_mxn: number;
  cooldown_min: number;
  daily_limit: number;
  business_hours_only: boolean;
}

export async function compileDynamicRule(
  locale: string,
  listingId: string,
  natural_language: string,
  session_id?: string
) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/dynamic-repricing-rule/compile`,
    {
      method: "POST",
      headers: headers(locale),
      body: JSON.stringify({ natural_language, session_id }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`compile ${res.status}`);
  return json as {
    compile_id: string;
    draft: DynamicRuleDraftPayload;
    explanation: string;
    persisted: boolean;
    compiler?: { driver: string; model: string | null; stub: boolean };
  };
}

export async function fetchRuleCompilerStatus(locale: string) {
  const res = await fetch(`/api/v1/rule-compiler/status`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`compiler status ${res.status}`);
  return res.json() as Promise<{
    driver: string;
    ready: boolean;
    note: string;
    llm_endpoint_configured: boolean;
  }>;
}

export async function downloadRuleCompilerStatusCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/rule-compiler/status/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`rule-compiler-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rule-compiler-status.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAgentTools(locale: string) {
  const res = await fetch(`/api/v1/agent/tools`, { headers: headers(locale) });
  if (!res.ok) throw new Error(`agent tools ${res.status}`);
  const json = await res.json();
  return json as {
    items: Array<{ name: string; mode: string; description: string }>;
  };
}

export async function downloadAgentToolsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/tools/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`agent-tools-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agent-tools.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAgentReadinessCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/readiness/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`agent-readiness-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agent-readiness.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCompetitorAnchorCsv(
  locale: string,
  listingId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/listings/${listingId}/competitors/anchor/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`competitor-anchor-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `competitor-anchor-${listingId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadProductReadinessCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/product/readiness/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`product-readiness-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product-readiness.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAgentMilestonesCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/milestones/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`agent-milestones-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agent-milestones.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAgentToolAudit(locale: string, limit = 20) {
  const res = await fetch(`/api/v1/agent/tool-audit?limit=${limit}`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`tool audit ${res.status}`);
  const json = await res.json();
  return json as {
    items: Array<{
      id: string;
      tool_name: string;
      result_summary: string;
      created_at: string;
    }>;
  };
}

export async function downloadAgentToolAuditCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/tool-audit/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`tool-audit-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agent-tool-audit.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchDigestSchedule(locale: string) {
  const res = await fetch(`/api/v1/agent/digest/schedule`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-schedule ${res.status}`);
  return res.json() as Promise<{
    enabled: boolean;
    cron: string;
    email_to: string;
    last_dispatch_at: string | null;
  }>;
}

export async function downloadDigestScheduleCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/digest/schedule/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-schedule-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digest-schedule.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function updateDigestSchedule(
  locale: string,
  body: {
    enabled?: boolean;
    cron?: string;
    email_to?: string;
    timezone?: string;
  }
) {
  const res = await fetch(`/api/v1/agent/digest/schedule`, {
    method: "PUT",
    headers: headers(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`digest-schedule-update ${res.status}`);
  return res.json();
}

export async function runDigestRunDue(locale: string, force = false) {
  const qs = force ? "?force=true" : "";
  const res = await fetch(`/api/v1/agent/digest/run-due${qs}`, {
    method: "POST",
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-run-due ${res.status}`);
  return res.json() as Promise<{
    digest: { narrative: string };
    schedule: { last_dispatch_at: string | null };
  }>;
}

export async function downloadFxRatesCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/fx-rates/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`fx-rates-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fx-rates.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchDigestDeadLetterSummary(locale: string, limit = 20) {
  const res = await fetch(
    `/api/v1/agent/digest/jobs/dead-letter/summary?limit=${encodeURIComponent(String(limit))}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`digest-dlq-summary ${res.status}`);
  return res.json() as Promise<{
    tenant_id: string;
    queue: {
      queued: number;
      dead_letter: number;
      total: number;
    };
    dead_letter_sampled: number;
    items: Array<{
      job_id: string;
      attempts: number;
      error: string | null;
      updated_at: string;
    }>;
  }>;
}

export async function downloadDigestDeadLetterSummaryCsv(
  locale: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/agent/digest/jobs/dead-letter/summary/export`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`digest-dlq-summary-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digest-dead-letter-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDigestDeadLetterCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/digest/jobs/dead-letter/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-dlq-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digest-dead-letter.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchDigestQueuedJobsSummary(locale: string, limit = 20) {
  const res = await fetch(
    `/api/v1/agent/digest/jobs/summary?limit=${encodeURIComponent(String(limit))}`,
    { headers: headers(locale) }
  );
  if (!res.ok) throw new Error(`digest-jobs-summary ${res.status}`);
  return res.json() as Promise<{
    queue: {
      total: number;
      queued: number;
      failed: number;
      dead_letter: number;
    };
    sampled: number;
    items: Array<{
      job_id: string;
      status: string;
      attempts: number;
      updated_at: string;
    }>;
  }>;
}

export async function downloadDigestQueuedJobsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/digest/jobs/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-jobs-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digest-queued-jobs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDigestQueuedJobsSummaryCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/agent/digest/jobs/summary/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-jobs-summary-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digest-queued-jobs-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadDigestDispatchesCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/agent/digest/dispatches/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest-dispatches-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "digest-dispatches.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadWorkerHeartbeatsCsv(locale: string): Promise<void> {
  const res = await fetch(`/api/v1/ops/workers/status/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`workers-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "worker-heartbeats.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadOpsWorkersStatusSummaryCsv(
  locale: string
): Promise<void> {
  const res = await fetch(`/api/v1/ops/workers/status/summary/export`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`workers-summary-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ops-workers-status-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function confirmCompiledDynamicRule(
  locale: string,
  listingId: string,
  compile_id: string
) {
  const res = await fetch(
    `/api/v1/listings/${listingId}/dynamic-repricing-rule/confirm-compiled`,
    {
      method: "POST",
      headers: headers(locale),
      body: JSON.stringify({ compile_id }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`confirm rule ${res.status}`);
  return json as { rule: { action: string; anchor_type: string }; persisted: boolean };
}

export async function createCopilotSession(
  locale: string,
  listing_id: string,
  sku_id?: string,
  channel?: Channel,
  bootstrap_context = true
) {
  const res = await fetch(`/api/v1/agent/copilot/sessions`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({
      listing_id,
      sku_id,
      channel,
      bootstrap_context,
    }),
  });
  if (!res.ok) throw new Error(`copilot session ${res.status}`);
  return res.json() as Promise<{
    session_id: string;
    messages: CopilotChatMessage[];
    context_bootstrapped: boolean;
  }>;
}

export type CopilotChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function fetchDailyAgentDigest(locale: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/v1/agent/digest/daily${q}`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`digest ${res.status}`);
  return res.json() as Promise<{
    date: string;
    narrative: string;
    metrics: {
      suggested_versions: number;
      pending_versions: number;
      open_reconciliation_alerts: number;
      agent_tool_invocations_today: number;
    };
    queue_highlights: Array<{
      sku_code: string;
      channel: string;
      state: string;
      publish_price: string;
    }>;
  }>;
}

export async function downloadAgentDigestCsv(
  locale: string,
  date?: string
): Promise<void> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/v1/agent/digest/daily/export${q}`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`agent-digest-export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agent-digest.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchAgentReadiness(locale: string) {
  const res = await fetch(`/api/v1/agent/readiness`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`readiness ${res.status}`);
  return res.json() as Promise<{
    ready: boolean;
    milestone: string;
    checks: Array<{ id: string; passed: boolean; detail: string }>;
  }>;
}

export interface ProductReadinessSnapshot {
  all_accepted: boolean;
  milestones: Array<{
    id: string;
    status: string;
    summary: string;
    loops: string;
  }>;
  p3: { ready: boolean };
  p4: { ready: boolean };
  p5: { ready: boolean };
}

export async function fetchProductReadiness(locale: string) {
  const res = await fetch(`/api/v1/product/readiness`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`product-readiness ${res.status}`);
  return res.json() as Promise<ProductReadinessSnapshot>;
}

export type FeatureFlagsSnapshot = Record<string, boolean | string> & {
  generated_at: string;
};

export async function fetchFeatureFlags(locale: string) {
  const res = await fetch(`/api/v1/feature-flags`, {
    headers: headers(locale),
  });
  if (!res.ok) throw new Error(`feature-flags ${res.status}`);
  return res.json() as Promise<FeatureFlagsSnapshot>;
}

export async function enqueueDailyDigest(locale: string) {
  const res = await fetch(`/api/v1/agent/digest/daily/enqueue`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ channels: ["email_stub", "webhook_queue"] }),
  });
  if (!res.ok) throw new Error(`digest enqueue ${res.status}`);
  return res.json() as Promise<{ job: { job_id: string; status: string } }>;
}

export async function processDigestJobs(locale: string, limit = 5) {
  const res = await fetch(`/api/v1/agent/digest/jobs/process`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ limit }),
  });
  if (!res.ok) throw new Error(`digest process ${res.status}`);
  return res.json() as Promise<{
    processed: Array<{ job_id: string; status: string }>;
  }>;
}

export async function dispatchDailyAgentDigest(locale: string) {
  const res = await fetch(`/api/v1/agent/digest/daily/dispatch`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ channels: ["email_stub"] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`digest dispatch ${res.status}`);
  return json as {
    job: {
      job_id: string;
      deliveries: Array<{ to: string; subject: string; body: string }>;
    };
    digest: { narrative: string };
  };
}

export async function sendCopilotMessage(
  locale: string,
  session_id: string,
  listing_id: string,
  content: string
) {
  const res = await fetch(
    `/api/v1/agent/copilot/sessions/${session_id}/messages`,
    {
      method: "POST",
      headers: headers(locale),
      body: JSON.stringify({ listing_id, content }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`copilot message ${res.status}`);
  return json as {
    intent?: string;
    needs_clarification: boolean;
    compile_id?: string;
    draft?: DynamicRuleDraftPayload;
    explanation?: string;
    messages: CopilotChatMessage[];
    compiler?: { driver: string; model: string | null; stub: boolean };
  };
}

export async function invokeAgentTool(
  locale: string,
  tool: string,
  args: Record<string, unknown>,
  session_id?: string
) {
  const res = await fetch(`/api/v1/agent/tools/invoke`, {
    method: "POST",
    headers: headers(locale),
    body: JSON.stringify({ tool, arguments: args, session_id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`agent tool ${res.status}`);
  return json as { tool: string; audit_id: string; result: unknown };
}

export { DEMO_SKU, LISTING_BY_CHANNEL };
