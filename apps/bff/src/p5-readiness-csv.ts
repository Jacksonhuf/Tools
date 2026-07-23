import type { evaluateP5Readiness } from "./p5-readiness.js";

type P5ReadinessSnapshot = ReturnType<typeof evaluateP5Readiness>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function p5ReadinessToCsv(
  snapshot: P5ReadinessSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,ready,milestone,check_id,passed,detail,test_file",
  ];
  for (const check of snapshot.checks) {
    lines.push(
      [
        exportedAt,
        snapshot.ready ? "true" : "false",
        cell(snapshot.milestone),
        cell(check.id),
        check.passed ? "true" : "false",
        cell(check.detail),
        cell(check.test_file),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
