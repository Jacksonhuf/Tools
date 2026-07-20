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

export { DEMO_SKU };
