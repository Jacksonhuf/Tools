import type { getProductReadinessSummary } from "./agent-milestones.js";

type ProductReadinessSnapshot = ReturnType<typeof getProductReadinessSummary>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function productReadinessToCsv(
  snapshot: ProductReadinessSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,record_kind,id,status,detail,loops",
  ];
  lines.push(
    [
      exportedAt,
      "summary",
      "all_accepted",
      snapshot.all_accepted ? "accepted" : "in_progress",
      "",
      "",
    ].join(",")
  );
  for (const m of snapshot.milestones) {
    lines.push(
      [
        exportedAt,
        "milestone",
        cell(m.id),
        cell(m.status),
        cell(m.summary),
        cell(m.loops),
      ].join(",")
    );
  }
  const phases = [
    ["p3", snapshot.p3],
    ["p4", snapshot.p4],
    ["p5", snapshot.p5],
  ] as const;
  for (const [phase, pack] of phases) {
    for (const check of pack.checks) {
      lines.push(
        [
          exportedAt,
          `check_${phase}`,
          cell(check.id),
          check.passed ? "passed" : "failed",
          cell(check.detail),
          "",
        ].join(",")
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
