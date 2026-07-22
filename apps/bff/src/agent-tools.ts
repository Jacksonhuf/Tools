import type { AppLocale } from "@mx-pricing/i18n-format";
import { formatMoney } from "@mx-pricing/i18n-format";
import type { CatalogRepository } from "./repositories/types.js";
import type { AdjustmentRepository } from "./repositories/adjustment-types.js";
import type { CompetitorRepository } from "./repositories/competitor-index.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";
import { buildPricingContext, runSimulate } from "./pricing-service.js";
import { buildAdjustmentBatchInput } from "./adjustment-service.js";
import { buildCompetitorAnchorSummary, mapOffersWithLatestObservations } from "./competitor-summary.js";
import { getListingIdForChannel } from "./fixtures.js";

export const AGENT_TOOL_CATALOG = [
  {
    name: "tool_get_pricing_context",
    mode: "read" as const,
    description: "Pricing context for a SKU (same as GET pricing-context)",
  },
  {
    name: "tool_list_price_versions",
    mode: "read" as const,
    description: "List price versions for a SKU",
  },
  {
    name: "tool_simulate",
    mode: "read" as const,
    description: "Simulate price without persisting a version",
  },
  {
    name: "tool_create_adjustment_draft",
    mode: "write_draft" as const,
    description: "Create adjustment batch in draft/pending_approval only",
  },
] as const;

export type AgentToolName = (typeof AGENT_TOOL_CATALOG)[number]["name"];

const BLOCKED_TOOL_NAMES = new Set([
  "tool_publish_price",
  "tool_apply_adjustment",
  "tool_channel_publish",
  "tool_apply_adjustment_batch",
]);

export function listAgentTools() {
  return AGENT_TOOL_CATALOG.map((t) => ({ ...t }));
}

export function assertAllowedAgentTool(name: string): AgentToolName {
  if (BLOCKED_TOOL_NAMES.has(name)) {
    throw new Error("TOOL_NOT_ALLOWED");
  }
  const found = AGENT_TOOL_CATALOG.find((t) => t.name === name);
  if (!found) {
    throw new Error("UNKNOWN_TOOL");
  }
  return found.name;
}

async function buildPricingContextPayload(
  catalog: CatalogRepository,
  competitors: CompetitorRepository,
  tenantId: string,
  locale: AppLocale,
  args: { sku_id: string; channel?: "MERCADO_LIBRE" | "AMAZON_MX" }
) {
  const sku = await catalog.getSku(tenantId, args.sku_id);
  if (!sku) {
    throw new Error("SKU_NOT_FOUND");
  }
  const channel = args.channel;
  const versions = await catalog.listVersions(sku.id);
  const active = versions.find(
    (v) => v.state === "active" && v.channel === (channel ?? "MERCADO_LIBRE")
  );
  const ctx = buildPricingContext(sku, channel, locale);
  if (active) {
    ctx.versions.active = {
      version_id: active.id,
      publish_price_mxn: active.publish_price_mxn,
      publish_price: formatMoney({
        locale,
        currency: "MXN",
        amount: active.publish_price_mxn,
      }),
      channel: active.channel as "MERCADO_LIBRE" | "AMAZON_MX",
    };
  }
  const ch = channel ?? "MERCADO_LIBRE";
  const listingId = getListingIdForChannel(ch);
  if (listingId) {
    const withLatest = await mapOffersWithLatestObservations(
      competitors,
      listingId
    );
    Object.assign(ctx, {
      competitors: {
        offers: withLatest,
        anchor: buildCompetitorAnchorSummary(withLatest),
      },
    });
  }
  return ctx;
}

function summarizeResult(tool: AgentToolName, result: unknown): string {
  if (tool === "tool_get_pricing_context" && result && typeof result === "object") {
    const sku = (result as { sku?: { sku_code?: string } }).sku?.sku_code;
    return `pricing-context:${sku ?? "unknown"}`;
  }
  if (tool === "tool_list_price_versions" && result && typeof result === "object") {
    const count = (result as { items?: unknown[] }).items?.length ?? 0;
    return `versions:${count}`;
  }
  if (tool === "tool_simulate" && result && typeof result === "object") {
    const price = (result as { publish_price_mxn?: number }).publish_price_mxn;
    return `simulate:${price ?? "?"}`;
  }
  if (
    tool === "tool_create_adjustment_draft" &&
    result &&
    typeof result === "object"
  ) {
    const batch = result as { id?: string; status?: string };
    return `batch:${batch.id ?? "?"}:${batch.status ?? "?"}`;
  }
  return "ok";
}

export async function invokeAgentTool(
  deps: {
    catalog: CatalogRepository;
    competitors: CompetitorRepository;
    adjustments: AdjustmentRepository;
    audit: AgentToolAuditRepository;
  },
  ctx: { tenantId: string; locale: AppLocale; sessionId?: string },
  toolName: string,
  args: Record<string, unknown>
): Promise<{ tool: AgentToolName; result: unknown; audit_id: string }> {
  const tool = assertAllowedAgentTool(toolName);
  let result: unknown;
  switch (tool) {
    case "tool_get_pricing_context": {
      const sku_id = String(args.sku_id ?? "");
      const channel = args.channel as "MERCADO_LIBRE" | "AMAZON_MX" | undefined;
      result = await buildPricingContextPayload(
        deps.catalog,
        deps.competitors,
        ctx.tenantId,
        ctx.locale,
        { sku_id, channel }
      );
      break;
    }
    case "tool_list_price_versions": {
      const sku_id = String(args.sku_id ?? "");
      const sku = await deps.catalog.getSku(ctx.tenantId, sku_id);
      if (!sku) throw new Error("SKU_NOT_FOUND");
      const items = await deps.catalog.listVersions(sku_id);
      result = { sku_id, items };
      break;
    }
    case "tool_simulate": {
      const sku_id = String(args.sku_id ?? "");
      const sku = await deps.catalog.getSku(ctx.tenantId, sku_id);
      if (!sku) throw new Error("SKU_NOT_FOUND");
      result = runSimulate(
        sku,
        args as Parameters<typeof runSimulate>[1],
        ctx.locale
      );
      break;
    }
    case "tool_create_adjustment_draft": {
      const body = args as {
        reason_code?: string;
        items: Array<{ listing_id: string; explicit_price_mxn: number }>;
      };
      if (!body.items?.length) {
        throw new Error("ITEMS_REQUIRED");
      }
      const built = await buildAdjustmentBatchInput(
        deps.catalog,
        ctx.tenantId,
        body
      );
      const batch = await deps.adjustments.createBatch({
        tenant_id: ctx.tenantId,
        status: built.status,
        reason_code: built.reason_code,
        items: built.prepared.map((p) => ({
          listing_id: p.listing_id,
          explicit_price_mxn: p.explicit_price_mxn,
          from_price_mxn: p.from_price_mxn,
          guard_result: p.guard_result,
        })),
      });
      result = batch;
      break;
    }
    default:
      throw new Error("UNKNOWN_TOOL");
  }

  const audit = await deps.audit.recordInvocation({
    tenant_id: ctx.tenantId,
    tool_name: tool,
    session_id: ctx.sessionId ?? null,
    arguments_json: args,
    result_summary: summarizeResult(tool, result),
  });

  return { tool, result, audit_id: audit.id };
}
