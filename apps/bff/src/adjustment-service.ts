import { checkMinMargin } from "@mx-pricing/pricing-engine";
import type { CatalogRepository } from "./repositories/types.js";
import type {
  AdjustmentRepository,
  AdjustmentStatus,
} from "./repositories/adjustment-types.js";
import {
  getAdjustmentApprovalPolicy,
  impliedMarginBelowTarget,
} from "./adjustment-approval-policy.js";

export function computeDropPct(
  fromPrice: number | null,
  toPrice: number
): number {
  if (!fromPrice || fromPrice <= 0) return 0;
  if (toPrice >= fromPrice) return 0;
  return ((fromPrice - toPrice) / fromPrice) * 100;
}

export async function buildAdjustmentBatchInput(
  catalog: CatalogRepository,
  tenantId: string,
  body: {
    reason_code?: string;
    items: Array<{ listing_id: string; explicit_price_mxn: number }>;
  }
) {
  const prepared: Array<{
    listing_id: string;
    explicit_price_mxn: number;
    from_price_mxn: number | null;
    guard_result: string | null;
    listing: NonNullable<Awaited<ReturnType<CatalogRepository["getListing"]>>>;
  }> = [];

  let maxDrop = 0;
  let marginBelowTarget = false;

  for (const item of body.items) {
    const listing = await catalog.getListing(tenantId, item.listing_id);
    if (!listing) {
      throw new Error(`LISTING_NOT_FOUND:${item.listing_id}`);
    }
    const sku = listing.sku;
    const fee =
      listing.channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
    const versions = await catalog.listVersions(sku.id);
    const active = versions.find(
      (v) => v.state === "active" && v.channel === listing.channel
    );
    const from_price_mxn = active?.publish_price_mxn ?? null;
    const guard = checkMinMargin({
      landed_cost_mxn: sku.landed_cost_mxn,
      publish_price_mxn: item.explicit_price_mxn,
      min_margin_pct: sku.policy.min_margin_pct,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate,
    });
    if (guard) {
      throw new Error(`GUARD_REJECTED:${guard}`);
    }
    const drop = computeDropPct(from_price_mxn, item.explicit_price_mxn);
    maxDrop = Math.max(maxDrop, drop);
    if (
      from_price_mxn !== null &&
      item.explicit_price_mxn < from_price_mxn &&
      impliedMarginBelowTarget({
        landed_cost_mxn: sku.landed_cost_mxn,
        publish_price_mxn: item.explicit_price_mxn,
        fee_template: fee,
        tax_strategy: sku.policy.tax_strategy,
        iva_rate: sku.policy.iva_rate,
        target_margin_pct: sku.policy.target_margin_pct,
      })
    ) {
      marginBelowTarget = true;
    }
    prepared.push({
      listing_id: item.listing_id,
      explicit_price_mxn: item.explicit_price_mxn,
      from_price_mxn,
      guard_result: null,
      listing,
    });
  }

  const policy = getAdjustmentApprovalPolicy();
  const approval_triggers: string[] = [];
  if (maxDrop > policy.max_drop_pct_without_approval) {
    approval_triggers.push("DROP_EXCEEDS_THRESHOLD");
  }
  if (
    marginBelowTarget &&
    policy.require_approval_below_target_margin
  ) {
    approval_triggers.push("MARGIN_BELOW_TARGET");
  }

  const status: AdjustmentStatus =
    approval_triggers.length > 0 ? "pending_approval" : "draft";

  return {
    status,
    reason_code: body.reason_code,
    prepared,
    maxDrop,
    approval_triggers,
  };
}

export async function applyAdjustmentBatch(
  catalog: CatalogRepository,
  adjustments: AdjustmentRepository,
  tenantId: string,
  batchId: string
) {
  const batch = await adjustments.getBatch(tenantId, batchId);
  if (!batch) return { error: "NOT_FOUND" as const };
  if (batch.status === "pending_approval") {
    return { error: "APPROVAL_REQUIRED" as const };
  }
  if (batch.status === "applied") {
    return { error: "ALREADY_APPLIED" as const };
  }
  if (batch.status !== "draft" && batch.status !== "approved") {
    return { error: "INVALID_STATUS" as const };
  }

  const versionIds: string[] = [];
  for (const item of batch.items) {
    const listing = await catalog.getListing(tenantId, item.listing_id);
    if (!listing) continue;
    const version = await catalog.createVersion({
      tenant_id: tenantId,
      sku_id: listing.sku.id,
      channel: listing.channel,
      state: "active",
      publish_price_mxn: item.explicit_price_mxn,
      reason: `adjustment:${batchId}`,
    });
    versionIds.push(version.id);
    await adjustments.setItemVersionId(batch.id, item.id, version.id);
  }

  const updated = await adjustments.updateBatchStatus(
    tenantId,
    batchId,
    "applied",
    { applied_at: new Date().toISOString() }
  );

  return { batch: updated, version_ids: versionIds };
}
