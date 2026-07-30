import type { evaluateReleaseGate } from "./release-gate.js";

type ReleaseGateSnapshot = ReturnType<typeof evaluateReleaseGate>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function releaseGateToCsv(
  snapshot: ReleaseGateSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,p0_blocking_ready,ready,gate_id,priority,blocking,passed,detail,test_file,ci_job,npm_script",
  ];
  for (const gate of snapshot.gates) {
    lines.push(
      [
        exportedAt,
        snapshot.p0_blocking_ready ? "true" : "false",
        snapshot.ready ? "true" : "false",
        cell(gate.id),
        cell(gate.priority),
        gate.blocking ? "true" : "false",
        gate.passed ? "true" : "false",
        cell(gate.detail),
        cell(gate.test_file),
        cell(gate.ci_job),
        cell(gate.npm_script),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
