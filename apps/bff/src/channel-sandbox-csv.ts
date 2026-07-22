import type { ChannelSandboxEvent } from "./channel-sandbox-ledger.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function channelSandboxEventsToCsv(
  events: ChannelSandboxEvent[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,id,listing_id,channel,event_type,created_at,payload_json",
  ];
  for (const e of events) {
    lines.push(
      [
        exportedAt,
        e.id,
        e.listing_id,
        e.channel,
        e.event_type,
        e.created_at,
        cell(JSON.stringify(e.payload)),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
