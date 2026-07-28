import type { AppLocale } from "@mx-pricing/i18n-format";

export type DigestDeliveryChannel =
  | "email_stub"
  | "webhook_queue"
  | "smtp_queue";

export type DigestDeliveryStatus =
  | "sent_stub"
  | "webhook_accepted"
  | "webhook_skipped"
  | "smtp_accepted"
  | "smtp_skipped"
  | "smtp_stub_queued";

export type DigestQueuedJob = {
  job_id: string;
  tenant_id: string;
  locale: AppLocale;
  date: string | null;
  channels: DigestDeliveryChannel[];
  status:
    | "queued"
    | "processing"
    | "completed"
    | "failed"
    | "dead_letter";
  attempts: number;
  simulate_poison?: boolean;
  created_at: string;
  updated_at: string;
  error: string | null;
  result: DigestDispatchResult | null;
};

export interface DigestDeliveryResult {
  channel: DigestDeliveryChannel;
  status: DigestDeliveryStatus;
  to?: string;
  subject?: string;
  body?: string;
  webhook_url?: string | null;
  smtp_host?: string | null;
  submission_url?: string | null;
}

export interface DigestDispatchResult {
  date: string;
  digest: import("./agent-digest-service.js").DailyAgentDigest;
  deliveries: DigestDeliveryResult[];
}
