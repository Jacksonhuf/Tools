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
  getVersionById,
  listVersions,
  resetVersionsForTests,
  setVersionChannelPublishStatus,
  updateVersionState,
  type PriceVersionRecord,
  type VersionState,
} from "../version-store.js";
import type { CatalogRepository } from "./types.js";

const DEMO_SKU_FEE_SNAPSHOT = {
  fee_ml: { ...DEMO_SKU.fee_ml },
  fee_amazon: { ...DEMO_SKU.fee_amazon },
};
const DEMO_SKU_POLICY_SNAPSHOT = { ...DEMO_SKU.policy };

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

  async getVersion(
    tenantId: string,
    versionId: string
  ): Promise<PriceVersionRecord | undefined> {
    const v = getVersionById(versionId);
    if (!v) return undefined;
    const sku = await this.getSku(tenantId, v.sku_id);
    if (!sku) return undefined;
    return v;
  }

  async createVersion(input: import("./types.js").CreateVersionParams): Promise<PriceVersionRecord> {
    return createVersion({
      sku_id: input.sku_id,
      channel: input.channel,
      state: input.state,
      publish_price_mxn: input.publish_price_mxn,
      trigger_event_id: input.trigger_event_id,
      dynamic_rule_id: input.dynamic_rule_id,
      competitor_snapshot_ids: input.competitor_snapshot_ids,
      floor_snapshot_id: input.floor_snapshot_id,
      cost_snapshot_id: input.cost_snapshot_id,
    });
  }

  async updateVersionState(
    versionId: string,
    expectedState: VersionState,
    newState: VersionState
  ): Promise<PriceVersionRecord | undefined> {
    return updateVersionState(versionId, expectedState, newState);
  }

  async setVersionChannelPublishStatus(
    versionId: string,
    status: PriceVersionRecord["channel_publish_status"]
  ): Promise<void> {
    if (status) {
      setVersionChannelPublishStatus(versionId, status);
    }
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

  async updateSkuChannelFee(
    tenantId: string,
    skuId: string,
    channel: "MERCADO_LIBRE" | "AMAZON_MX",
    fee: import("@mx-pricing/pricing-engine").FeeTemplate
  ): Promise<SkuRecord | undefined> {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku) return undefined;
    const next = { ...fee };
    if (channel === "MERCADO_LIBRE") sku.fee_ml = next;
    else sku.fee_amazon = next;
    if (skuId === DEMO_SKU.id && tenantId === DEMO_SKU.tenant_id) {
      if (channel === "MERCADO_LIBRE") DEMO_SKU.fee_ml = next;
      else DEMO_SKU.fee_amazon = next;
    }
    return sku;
  }

  async updateSkuPolicy(
    tenantId: string,
    skuId: string,
    patch: Partial<SkuRecord["policy"]>
  ): Promise<SkuRecord | undefined> {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku) return undefined;
    sku.policy = { ...sku.policy, ...patch };
    if (skuId === DEMO_SKU.id && tenantId === DEMO_SKU.tenant_id) {
      DEMO_SKU.policy = { ...DEMO_SKU.policy, ...patch };
    }
    return sku;
  }

  resetForTests(): void {
    resetVersionsForTests();
    DEMO_SKU.landed_cost_mxn = 1000;
    DEMO_SKU.fee_ml = { ...DEMO_SKU_FEE_SNAPSHOT.fee_ml };
    DEMO_SKU.fee_amazon = { ...DEMO_SKU_FEE_SNAPSHOT.fee_amazon };
    DEMO_SKU.policy = { ...DEMO_SKU_POLICY_SNAPSHOT };
  }
}

export { DEMO_SKU, DEMO_LISTING_ML };
