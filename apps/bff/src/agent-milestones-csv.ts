import type { getProductMilestoneStatus } from "./agent-milestones.js";

type AgentMilestonesSnapshot = ReturnType<typeof getProductMilestoneStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function agentMilestonesToCsv(
  snapshot: AgentMilestonesSnapshot,
  exportedAt: string
): string {
  const lines = ["exported_at,milestone_id,status,summary,loops"];
  for (const m of snapshot.milestones) {
    lines.push(
      [
        exportedAt,
        cell(m.id),
        cell(m.status),
        cell(m.summary),
        cell(m.loops),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
