import type { AgentToolInvocationRecord } from "./repositories/agent-audit-types.js";

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function agentToolAuditToCsv(
  items: AgentToolInvocationRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,id,tool_name,session_id,result_summary,created_at,arguments_json",
  ];
  for (const row of items) {
    lines.push(
      [
        cell(exportedAt),
        cell(row.id),
        cell(row.tool_name),
        cell(row.session_id),
        cell(row.result_summary),
        cell(row.created_at),
        cell(JSON.stringify(row.arguments_json)),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
