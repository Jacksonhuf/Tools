import type { AppLocale } from "@mx-pricing/i18n-format";
import type { NotificationInboxRecord } from "./repositories/notification-inbox-types.js";

function cell(value: string | null | undefined): string {
  if (value == null) return "";
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function notificationInboxToCsv(
  locale: AppLocale,
  items: NotificationInboxRecord[],
  exportedAt: string
): string {
  const lines = [
    "exported_at,locale,id,template_id,event,channel,listing_id,read_at,created_at,subject,body",
  ];
  for (const row of items) {
    lines.push(
      [
        cell(exportedAt),
        cell(locale),
        cell(row.id),
        cell(row.template_id),
        cell(row.event),
        cell(row.channel),
        cell(row.listing_id),
        cell(row.read_at),
        cell(row.created_at),
        cell(row.subject),
        cell(row.body),
      ].join(",")
    );
  }
  return lines.join("\n");
}
