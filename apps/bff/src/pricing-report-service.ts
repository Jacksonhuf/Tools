import type { CatalogRepository } from "./repositories/types.js";
import { buildFloors } from "./pricing-service.js";

export type PricingSnapshotRow = {
  sku_id: string;
  sku_code: string;
  channel: "MERCADO_LIBRE" | "AMAZON_MX";
  active_price_mxn: number | null;
  floor_price_mxn: number;
  landed_cost_mxn: number;
};

export async function buildPricingSnapshotRows(
  catalog: CatalogRepository,
  tenantId: string,
  skuId: string
): Promise<PricingSnapshotRow[]> {
  const sku = await catalog.getSku(tenantId, skuId);
  if (!sku) {
    return [];
  }
  const versions = await catalog.listVersions(skuId);
  const { floor_ml, floor_amazon } = buildFloors(sku);
  const channels: Array<{
    channel: "MERCADO_LIBRE" | "AMAZON_MX";
    floor: number;
  }> = [
    { channel: "MERCADO_LIBRE", floor: floor_ml },
    { channel: "AMAZON_MX", floor: floor_amazon },
  ];
  return channels.map(({ channel, floor }) => {
    const active = versions.find(
      (v) => v.state === "active" && v.channel === channel
    );
    return {
      sku_id: sku.id,
      sku_code: sku.sku_code,
      channel,
      active_price_mxn: active?.publish_price_mxn ?? null,
      floor_price_mxn: floor,
      landed_cost_mxn: sku.landed_cost_mxn,
    };
  });
}

export function pricingSnapshotToCsv(
  rows: PricingSnapshotRow[],
  exportedAt: string
): string {
  const header =
    "exported_at,sku_id,sku_code,channel,active_price_mxn,floor_price_mxn,landed_cost_mxn";
  const lines = rows.map((r) =>
    [
      exportedAt,
      r.sku_id,
      r.sku_code,
      r.channel,
      r.active_price_mxn ?? "",
      r.floor_price_mxn,
      r.landed_cost_mxn,
    ].join(",")
  );
  return [header, ...lines].join("\n");
}
