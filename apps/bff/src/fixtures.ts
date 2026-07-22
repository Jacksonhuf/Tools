import type { FeeTemplate } from "@mx-pricing/pricing-engine";

export interface SkuRecord {
  id: string;
  tenant_id: string;
  sku_code: string;
  name: string;
  category_id?: string;
  landed_cost_mxn: number;
  policy: {
    pricing_mode: "cost" | "competitive" | "competitive_with_floor";
    target_margin_pct: number;
    min_margin_pct: number;
    tax_strategy: "PRICE_INCLUDES_IVA" | "PRICE_EXCLUDES_IVA";
    iva_rate: number;
  };
  fee_ml: FeeTemplate;
  fee_amazon: FeeTemplate;
}

export const DEMO_SKU: SkuRecord = {
  id: "demo-sku-001",
  tenant_id: "tenant-demo",
  sku_code: "MX-DEMO-001",
  name: "Demo Cross-Border SKU",
  category_id: "cat-electronics-mx",
  landed_cost_mxn: 1000,
  policy: {
    pricing_mode: "competitive_with_floor",
    target_margin_pct: 20,
    min_margin_pct: 10,
    tax_strategy: "PRICE_EXCLUDES_IVA",
    iva_rate: 0.16,
  },
  fee_ml: {
    commission_pct_of_price: 18,
    payment_pct_of_price: 3,
    fulfillment_fixed_mxn: 40,
  },
  fee_amazon: {
    commission_pct_of_price: 15,
    payment_pct_of_price: 0,
    fulfillment_fixed_mxn: 55,
  },
};

export interface ListingRecord {
  id: string;
  sku_id: string;
  channel: "MERCADO_LIBRE" | "AMAZON_MX";
}

export const DEMO_LISTING_ML: ListingRecord = {
  id: "listing-ml-001",
  sku_id: DEMO_SKU.id,
  channel: "MERCADO_LIBRE",
};

export const DEMO_LISTING_AMAZON: ListingRecord = {
  id: "listing-amz-001",
  sku_id: DEMO_SKU.id,
  channel: "AMAZON_MX",
};

const LISTINGS = [DEMO_LISTING_ML, DEMO_LISTING_AMAZON];

export function getListing(
  tenantId: string,
  listingId: string
): (ListingRecord & { sku: SkuRecord }) | undefined {
  if (tenantId !== DEMO_SKU.tenant_id) return undefined;
  const listing = LISTINGS.find((l) => l.id === listingId);
  if (!listing) return undefined;
  const sku = getSku(tenantId, listing.sku_id);
  if (!sku) return undefined;
  return { ...listing, sku };
}

export function listSkusForTenant(tenantId: string): SkuRecord[] {
  const sku = getSku(tenantId, DEMO_SKU.id);
  return sku ? [sku] : [];
}

export function getSku(
  tenantId: string,
  skuId: string
): SkuRecord | undefined {
  if (skuId !== DEMO_SKU.id || tenantId !== DEMO_SKU.tenant_id) {
    return undefined;
  }
  return DEMO_SKU;
}

export function getListingIdForChannel(
  channel: ListingRecord["channel"]
): string | undefined {
  const listing = LISTINGS.find((l) => l.channel === channel);
  return listing?.id;
}

export function listListingsForSku(
  tenantId: string,
  skuId: string
): ListingRecord[] {
  if (tenantId !== DEMO_SKU.tenant_id) return [];
  return LISTINGS.filter((l) => l.sku_id === skuId);
}
