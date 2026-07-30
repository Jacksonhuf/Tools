import type { AppLocale } from "@mx-pricing/i18n-format";

export type NotificationDeliveryChannel = "in_app" | "email_stub" | "webhook";

export interface NotificationInboxRecord {
  id: string;
  tenant_id: string;
  template_id: string;
  event: string;
  locale: AppLocale;
  channel: NotificationDeliveryChannel;
  subject: string;
  body: string;
  listing_id: string | null;
  read_at: string | null;
  created_at: string;
  delivery_status: "stored" | "email_stub" | "webhook_accepted" | "webhook_skipped";
}

export interface NotificationInboxRepository {
  readonly driver: "memory" | "postgres";
  create(
    input: Omit<NotificationInboxRecord, "id" | "created_at" | "read_at">
  ): Promise<NotificationInboxRecord>;
  list(tenantId: string, limit?: number): Promise<NotificationInboxRecord[]>;
  markRead(tenantId: string, id: string): Promise<NotificationInboxRecord | undefined>;
  resetForTests?(): void;
}
