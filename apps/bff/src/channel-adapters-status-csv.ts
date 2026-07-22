import type { getChannelAdapterStatus } from "./channel-adapter-factory.js";

type ChannelAdapterStatus = ReturnType<typeof getChannelAdapterStatus>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function channelAdapterStatusToCsv(
  status: ChannelAdapterStatus,
  exportedAt: string
): string {
  const lines = [
    "exported_at,driver,ready,publish_http_url_configured,listing_pull_http_url_configured,channel_live_acknowledged,note",
  ];
  lines.push(
    [
      exportedAt,
      cell(status.driver),
      status.ready ? "true" : "false",
      status.publish_http_url_configured ? "true" : "false",
      status.listing_pull_http_url_configured ? "true" : "false",
      status.channel_live_acknowledged ? "true" : "false",
      cell(status.note),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
