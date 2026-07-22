import type { getRuleCompilerStatus } from "./rule-compiler-adapter.js";

type RuleCompilerStatus = ReturnType<typeof getRuleCompilerStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function ruleCompilerStatusToCsv(
  status: RuleCompilerStatus,
  exportedAt: string
): string {
  const lines = [
    "exported_at,driver,ready,llm_ready,llm_endpoint_configured,llm_model,note",
  ];
  lines.push(
    [
      exportedAt,
      cell(status.driver),
      status.ready ? "true" : "false",
      status.llm_ready ? "true" : "false",
      status.llm_endpoint_configured ? "true" : "false",
      cell(status.llm_model),
      cell(status.note),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
