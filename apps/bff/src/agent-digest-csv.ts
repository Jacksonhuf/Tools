import type { DailyAgentDigest } from "./agent-digest-service.js";

function cell(value: string | number): string {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function agentDigestToCsv(digest: DailyAgentDigest): string {
  const lines = [
    "section,date,tenant_id,locale,field,value",
    `metrics,${cell(digest.date)},${cell(digest.tenant_id)},${cell(digest.locale)},sku_count,${digest.metrics.sku_count}`,
    `metrics,${cell(digest.date)},${cell(digest.tenant_id)},${cell(digest.locale)},suggested_versions,${digest.metrics.suggested_versions}`,
    `metrics,${cell(digest.date)},${cell(digest.tenant_id)},${cell(digest.locale)},pending_versions,${digest.metrics.pending_versions}`,
    `metrics,${cell(digest.date)},${cell(digest.tenant_id)},${cell(digest.locale)},open_reconciliation_alerts,${digest.metrics.open_reconciliation_alerts}`,
    `metrics,${cell(digest.date)},${cell(digest.tenant_id)},${cell(digest.locale)},agent_tool_invocations_today,${digest.metrics.agent_tool_invocations_today}`,
    `narrative,${cell(digest.date)},${cell(digest.tenant_id)},${cell(digest.locale)},text,${cell(digest.narrative)}`,
    "highlight,date,sku_id,sku_code,channel,state,publish_price_mxn,publish_price",
  ];
  for (const h of digest.queue_highlights) {
    lines.push(
      [
        "highlight",
        cell(digest.date),
        cell(h.sku_id),
        cell(h.sku_code),
        cell(h.channel),
        cell(h.state),
        h.publish_price_mxn,
        cell(h.publish_price),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
