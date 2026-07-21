import type { AppLocale } from "@mx-pricing/i18n-format";
import { formatMoney } from "@mx-pricing/i18n-format";
import type { CatalogRepository } from "./repositories/index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";
import { listRepricingQueue } from "./repricing-queue-service.js";

export interface DailyAgentDigest {
  date: string;
  tenant_id: string;
  locale: AppLocale;
  narrative: string;
  metrics: {
    sku_count: number;
    suggested_versions: number;
    pending_versions: number;
    open_reconciliation_alerts: number;
    agent_tool_invocations_today: number;
  };
  queue_highlights: Array<{
    sku_id: string;
    sku_code: string;
    channel: string;
    state: string;
    publish_price_mxn: number;
    publish_price: string;
  }>;
}

function dayBoundsUtc(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildDailyAgentDigest(
  deps: {
    catalog: CatalogRepository;
    reconciliationAlerts: ReconciliationAlertRepository;
    agentAudit: AgentToolAuditRepository;
  },
  tenantId: string,
  locale: AppLocale,
  dateStr?: string
): Promise<DailyAgentDigest> {
  const date = dateStr?.trim() || todayUtcDate();
  const { start, end } = dayBoundsUtc(date);

  const skus = await deps.catalog.listSkus(tenantId);
  let suggested = 0;
  let pending = 0;
  const queue_highlights: DailyAgentDigest["queue_highlights"] = [];

  for (const sku of skus) {
    const { items } = await listRepricingQueue(deps.catalog, tenantId, sku.id);
    for (const item of items) {
      if (item.state === "suggested") suggested += 1;
      if (item.state === "pending") pending += 1;
      if (queue_highlights.length < 5) {
        queue_highlights.push({
          sku_id: sku.id,
          sku_code: sku.sku_code,
          channel: item.channel,
          state: item.state,
          publish_price_mxn: item.publish_price_mxn,
          publish_price: formatMoney({
            locale,
            currency: "MXN",
            amount: item.publish_price_mxn,
          }).formatted,
        });
      }
    }
  }

  const alerts = await deps.reconciliationAlerts.listAlerts(tenantId);
  const openAlerts = alerts.filter((a) => !a.resolved_at).length;

  const auditItems = await deps.agentAudit.listInvocations(tenantId, 200);
  const invocationsToday = auditItems.filter((row) => {
    const t = new Date(row.created_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;

  const narrative =
    locale === "es-MX"
      ? `Resumen ${date}: ${skus.length} SKU(s); ${suggested} precios sugeridos y ${pending} pendientes; ${openAlerts} alertas de reconciliación abiertas; ${invocationsToday} invocaciones de herramientas agente hoy.`
      : locale === "zh-CN"
        ? `${date} 摘要：${skus.length} 个 SKU；Suggested ${suggested} / Pending ${pending}；未处理对账告警 ${openAlerts}；当日 Agent 工具调用 ${invocationsToday} 次。`
        : `Digest ${date}: ${skus.length} SKU(s); ${suggested} suggested and ${pending} pending prices; ${openAlerts} open reconciliation alerts; ${invocationsToday} agent tool invocations today.`;

  return {
    date,
    tenant_id: tenantId,
    locale,
    narrative,
    metrics: {
      sku_count: skus.length,
      suggested_versions: suggested,
      pending_versions: pending,
      open_reconciliation_alerts: openAlerts,
      agent_tool_invocations_today: invocationsToday,
    },
    queue_highlights,
  };
}
