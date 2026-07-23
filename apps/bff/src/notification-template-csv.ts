import type { AppLocale } from "@mx-pricing/i18n-format";
import {
  formatNotificationTemplatesForLocale,
  getNotificationTemplate,
  type NotificationTemplate,
} from "./notification-templates.js";

function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function notificationTemplatesToCsv(
  locale: AppLocale,
  exportedAt: string
): string {
  const lines = [
    "exported_at,locale,template_id,event,channel,subject,body",
  ];
  for (const row of formatNotificationTemplatesForLocale(locale)) {
    lines.push(
      [
        exportedAt,
        cell(locale),
        cell(row.id),
        cell(row.event),
        cell(row.channel),
        cell(row.subject),
        cell(row.body),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function notificationTemplateToCsv(
  template: NotificationTemplate,
  locale: AppLocale,
  exportedAt: string
): string {
  return [
    "exported_at,locale,template_id,event,channel,subject,body",
    [
      exportedAt,
      cell(locale),
      cell(template.id),
      cell(template.event),
      cell(template.channel),
      cell(template.subject[locale]),
      cell(template.body[locale]),
    ].join(","),
    "",
  ].join("\n");
}

export function getNotificationTemplateOrThrow(
  templateId: string
): NotificationTemplate {
  const template = getNotificationTemplate(templateId);
  if (!template) {
    throw new Error("NOTIFICATION_TEMPLATE_NOT_FOUND");
  }
  return template;
}
