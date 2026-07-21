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

export { DEMO_SKU };
