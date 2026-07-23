import type { evaluateP3Readiness } from "./p3-readiness.js";

type P3ReadinessSnapshot = ReturnType<typeof evaluateP3Readiness>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function p3ReadinessToCsv(
  snapshot: P3ReadinessSnapshot,
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
