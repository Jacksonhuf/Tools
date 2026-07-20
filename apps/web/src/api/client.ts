const DEMO_SKU = "demo-sku-001";
const DEMO_LISTING_ML = "listing-ml-001";
const AUTH = "dev-token";
const TENANT = "tenant-demo";

export type Channel = "MERCADO_LIBRE" | "AMAZON_MX";

function headers(locale: string): HeadersInit {
  return {
    Authorization: `Bearer ${AUTH}`,
    "X-Tenant-Id": TENANT,
    "Accept-Language": locale,
    "Content-Type": "application/json",
  };
}

export async function fetchPricingContext(
  locale: string,
  channel: Channel
) {
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
  explicit_price_mxn: number
) {
  const res = await fetch(
    `/api/v1/listings/${DEMO_LISTING_ML}/price-versions`,
    {
      method: "POST",
      headers: headers(locale),
      body: JSON.stringify({ explicit_price_mxn, reason: "web-ui" }),
    }
  );
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export { DEMO_SKU };
