import type { FeeTemplate } from "@mx-pricing/pricing-engine";
import type { SkuRecord, ListingRecord } from "../fixtures.js";
import type { PriceVersionRecord, VersionState } from "../version-store.js";

export interface CatalogRepository {
  readonly driver: "memory" | "postgres";
  getSku(tenantId: string, skuId: string): Promise<SkuRecord | undefined>;
  getListing(
    tenantId: string,
    listingId: string
  ): Promise<(ListingRecord & { sku: SkuRecord }) | undefined>;
  listVersions(skuId: string): Promise<PriceVersionRecord[]>;
  createVersion(input: {
    tenant_id: string;
    sku_id: string;
    channel: string;
    state: VersionState;
    publish_price_mxn: number;
    reason?: string;
  }): Promise<PriceVersionRecord>;
  countVersions(): Promise<number>;
  resetForTests?(): void;
}

export function rowToSku(row: {
  id: string;
  tenant_id: string;
  sku_code: string;
  name: string;
  landed_cost_mxn: string;
  policy_json: SkuRecord["policy"];
  fee_ml_json: FeeTemplate;
  fee_amazon_json: FeeTemplate;
}): SkuRecord {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    sku_code: row.sku_code,
    name: row.name,
    landed_cost_mxn: Number(row.landed_cost_mxn),
    policy: row.policy_json,
    fee_ml: row.fee_ml_json,
    fee_amazon: row.fee_amazon_json,
  };
}
