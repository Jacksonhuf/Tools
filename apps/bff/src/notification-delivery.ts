import type { AppLocale } from "@mx-pricing/i18n-format";
import { getNotificationTemplate } from "./notification-templates.js";
import { renderNotificationTemplate } from "./notification-template-render.js";
import { getNotificationInboxRepository } from "./repositories/notification-inbox-index.js";
import type {
  NotificationDeliveryChannel,
  NotificationInboxRecord,
} from "./repositories/notification-inbox-types.js";

export type NotificationDispatchInput = {
  tenant_id: string;
  locale: AppLocale;
  template_id: string;
  listing_id?: string | null;
  vars: Record<string, string | number | null | undefined>;
  channels?: NotificationDeliveryChannel[];
};

async function deliverEmailWebhook(payload: {
  tenant_id: string;
  template_id: string;
  subject: string;
  body: string;
  listing_id: string | null;
}): Promise<"webhook_accepted" | "webhook_skipped"> {
  const url = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  if (!url) {
    return "webhook_skipped";
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`NOTIFICATION_WEBHOOK_${res.status}`);
  }
  return "webhook_accepted";
}

export async function dispatchNotification(
  input: NotificationDispatchInput
): Promise<NotificationInboxRecord[]> {
  const template = getNotificationTemplate(input.template_id);
  if (!template) {
    throw new Error("NOTIFICATION_TEMPLATE_NOT_FOUND");
  }

  const locale = input.locale;
  const subject = renderNotificationTemplate(template.subject[locale], input.vars);
  const body = renderNotificationTemplate(template.body[locale], input.vars);
  const channels =
    input.channels ??
    (template.channel === "email"
      ? (["in_app", "email_stub"] as NotificationDeliveryChannel[])
      : (["in_app"] as NotificationDeliveryChannel[]));

  const inbox = getNotificationInboxRepository();
  const created: NotificationInboxRecord[] = [];

  for (const channel of channels) {
    if (channel === "webhook") {
      const status = await deliverEmailWebhook({
        tenant_id: input.tenant_id,
        template_id: input.template_id,
        subject,
        body,
        listing_id: input.listing_id ?? null,
      });
      created.push(
        await inbox.create({
          tenant_id: input.tenant_id,
          template_id: input.template_id,
          event: template.event,
          locale,
          channel: "webhook",
          subject,
          body,
          listing_id: input.listing_id ?? null,
          delivery_status: status,
        })
      );
      continue;
    }

    created.push(
      await inbox.create({
        tenant_id: input.tenant_id,
        template_id: input.template_id,
        event: template.event,
        locale,
        channel,
        subject,
        body,
        listing_id: input.listing_id ?? null,
        delivery_status: channel === "email_stub" ? "email_stub" : "stored",
      })
    );
  }

  return created;
}

export async function listNotificationInbox(tenantId: string, limit = 50) {
  return getNotificationInboxRepository().list(tenantId, limit);
}

export async function markNotificationRead(tenantId: string, id: string) {
  return getNotificationInboxRepository().markRead(tenantId, id);
}
