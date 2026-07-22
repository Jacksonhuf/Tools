import type { listAgentTools } from "./agent-tools.js";

type AgentToolRow = ReturnType<typeof listAgentTools>[number];

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function agentToolsToCsv(
  tools: AgentToolRow[],
  exportedAt: string
): string {
  const lines = ["exported_at,tool_name,mode,description"];
  for (const t of tools) {
    lines.push(
      [exportedAt, cell(t.name), cell(t.mode), cell(t.description)].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
