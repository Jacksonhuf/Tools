import type { CatalogRepository } from "./repositories/types.js";

export type SkuPolicyBatchItem = {
  sku_id: string;
  target_margin_pct?: number;
  min_margin_pct?: number;
  pricing_mode?: "cost" | "competitive" | "competitive_with_floor";
};

function validateMargins(item: SkuPolicyBatchItem): string | null {
  if (
    item.target_margin_pct !== undefined &&
    (item.target_margin_pct < 0 || item.target_margin_pct > 100)
  ) {
    return "INVALID_TARGET_MARGIN";
  }
  if (
    item.min_margin_pct !== undefined &&
    (item.min_margin_pct < 0 || item.min_margin_pct > 100)
  ) {
    return "INVALID_MIN_MARGIN";
  }
  return null;
}

export async function batchPatchSkuPolicies(
  catalog: CatalogRepository,
  tenantId: string,
  items: SkuPolicyBatchItem[]
) {
  const updated: Array<{ sku_id: string; policy: unknown }> = [];
  const errors: Array<{ sku_id: string; error: string }> = [];
  for (const item of items) {
    if (!item.sku_id?.trim()) {
      errors.push({ sku_id: item.sku_id ?? "", error: "SKU_ID_REQUIRED" });
      continue;
    }
    const marginErr = validateMargins(item);
    if (marginErr) {
      errors.push({ sku_id: item.sku_id, error: marginErr });
      continue;
    }
    const patch = {
      ...(item.target_margin_pct !== undefined
        ? { target_margin_pct: item.target_margin_pct }
        : {}),
      ...(item.min_margin_pct !== undefined
        ? { min_margin_pct: item.min_margin_pct }
        : {}),
      ...(item.pricing_mode !== undefined
        ? { pricing_mode: item.pricing_mode }
        : {}),
    };
    if (Object.keys(patch).length === 0) {
      errors.push({ sku_id: item.sku_id, error: "PATCH_EMPTY" });
      continue;
    }
    const row = await catalog.updateSkuPolicy(tenantId, item.sku_id, patch);
    if (!row) {
      errors.push({ sku_id: item.sku_id, error: "SKU_NOT_FOUND" });
      continue;
    }
    updated.push({ sku_id: item.sku_id, policy: row.policy });
  }
  return { updated, errors };
}
