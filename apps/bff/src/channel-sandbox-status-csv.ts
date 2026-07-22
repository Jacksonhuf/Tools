import type { getChannelSandboxStatus } from "./channel-sandbox-ledger.js";

type ChannelSandboxStatus = ReturnType<typeof getChannelSandboxStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function channelSandboxStatusToCsv(
  status: ChannelSandboxStatus,
  exportedAt: string
): string {
  const lines = [
    "exported_at,enabled,mode,allowed_operations,note",
  ];
  lines.push(
    [
      exportedAt,
      status.enabled ? "true" : "false",
      cell(status.mode),
      cell(status.allowed_operations.join("|")),
      cell(status.note),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
