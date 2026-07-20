import {
  DEMO_LISTING_ML,
  DEMO_SKU,
  getListing as memGetListing,
  getSku as memGetSku,
  listSkusForTenant,
  type ListingRecord,
  type SkuRecord,
} from "../fixtures.js";
import {
  countVersions,
  createVersion,
  listVersions,
  resetVersionsForTests,
  type PriceVersionRecord,
  type VersionState,
} from "../version-store.js";
import type { CatalogRepository } from "./types.js";

export class MemoryCatalogRepository implements CatalogRepository {
  readonly driver = "memory" as const;

  async getSku(tenantId: string, skuId: string): Promise<SkuRecord | undefined> {
    return memGetSku(tenantId, skuId);
  }

  async getListing(
    tenantId: string,
    listingId: string
  ): Promise<(ListingRecord & { sku: SkuRecord }) | undefined> {
    return memGetListing(tenantId, listingId);
  }

  async listVersions(skuId: string): Promise<PriceVersionRecord[]> {
    return listVersions(skuId);
  }

  async createVersion(input: {
    tenant_id: string;
    sku_id: string;
    channel: string;
    state: VersionState;
    publish_price_mxn: number;
    reason?: string;
  }): Promise<PriceVersionRecord> {
    return createVersion({
      sku_id: input.sku_id,
      channel: input.channel,
      state: input.state,
      publish_price_mxn: input.publish_price_mxn,
    });
  }

  async countVersions(): Promise<number> {
    return countVersions();
  }

  async listSkus(tenantId: string): Promise<SkuRecord[]> {
    return listSkusForTenant(tenantId);
  }

  async updateSkuLandedCost(
    tenantId: string,
    skuId: string,
    landed_cost_mxn: number
  ): Promise<SkuRecord | undefined> {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku) return undefined;
    sku.landed_cost_mxn = landed_cost_mxn;
    if (skuId === DEMO_SKU.id && tenantId === DEMO_SKU.tenant_id) {
      DEMO_SKU.landed_cost_mxn = landed_cost_mxn;
    }
    return sku;
  }

  resetForTests(): void {
    resetVersionsForTests();
    DEMO_SKU.landed_cost_mxn = 1000;
  }
}

export { DEMO_SKU, DEMO_LISTING_ML };
