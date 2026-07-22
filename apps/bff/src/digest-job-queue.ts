import type { AppLocale } from "@mx-pricing/i18n-format";
import type { DailyAgentDigest } from "./agent-digest-service.js";
import { buildDailyAgentDigest } from "./agent-digest-service.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";
import { getDigestSchedule } from "./agent-digest-dispatch.js";
import { deliverSmtpDigest } from "./smtp-digest-adapter.js";

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
  digest: DailyAgentDigest;
  deliveries: DigestDeliveryResult[];
}

const queue: DigestQueuedJob[] = [];
let queueSeq = 0;

export function listDigestQueuedJobs(
  tenantId: string,
  limit = 20
): DigestQueuedJob[] {
  return queue
    .filter((j) => j.tenant_id === tenantId)
    .slice(-limit)
    .reverse();
}

export function getDigestQueuedJob(
  tenantId: string,
  jobId: string
): DigestQueuedJob | undefined {
  const job = queue.find((j) => j.job_id === jobId);
  if (!job || job.tenant_id !== tenantId) return undefined;
  return job;
}

export function listDigestDeadLetterJobs(
  tenantId: string,
  limit = 20
): DigestQueuedJob[] {
  return queue
    .filter((j) => j.tenant_id === tenantId && j.status === "dead_letter")
    .slice(-limit)
    .reverse();
}

export function digestQueueSummary(tenantId: string) {
  const jobs = queue.filter((j) => j.tenant_id === tenantId);
  return {
    total: jobs.length,
    queued: jobs.filter((j) => j.status === "queued").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    dead_letter: jobs.filter((j) => j.status === "dead_letter").length,
  };
}

export function enqueueDailyDigestJob(input: {
  tenant_id: string;
  locale: AppLocale;
  date?: string;
  channels?: DigestDeliveryChannel[];
  simulate_poison?: boolean;
}): DigestQueuedJob {
  queueSeq += 1;
  const now = new Date().toISOString();
  const job: DigestQueuedJob = {
    job_id: `digest-q-${queueSeq}`,
    tenant_id: input.tenant_id,
    locale: input.locale,
    date: input.date?.trim() || null,
    channels: input.channels?.length
      ? input.channels
      : ["email_stub", "webhook_queue"],
    status: "queued",
    attempts: 0,
    simulate_poison: input.simulate_poison === true,
    created_at: now,
    updated_at: now,
    error: null,
    result: null,
  };
  queue.push(job);
  return job;
}

async function deliverWebhook(
  payload: { to: string; subject: string; body: string; tenant_id: string }
): Promise<DigestDeliveryResult> {
  const url = process.env.DIGEST_WEBHOOK_URL?.trim();
  if (!url) {
    return {
      channel: "webhook_queue",
      status: "webhook_skipped",
      webhook_url: null,
    };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`WEBHOOK_${res.status}`);
  }
  return {
    channel: "webhook_queue",
    status: "webhook_accepted",
    webhook_url: url,
    subject: payload.subject,
    body: payload.body,
  };
}

export async function runDigestDeliveries(
  deps: {
    catalog: CatalogRepository;
    reconciliationAlerts: ReconciliationAlertRepository;
    agentAudit: AgentToolAuditRepository;
  },
  tenantId: string,
  locale: AppLocale,
  options: {
    date?: string;
    channels: DigestDeliveryChannel[];
  }
): Promise<DigestDispatchResult> {
  const digest = await buildDailyAgentDigest(
    deps,
    tenantId,
    locale,
    options.date
  );
  const schedule = getDigestSchedule(tenantId);
  const subject =
    locale === "es-MX"
      ? `Resumen diario MX Pricing — ${digest.date}`
      : locale === "zh-CN"
        ? `墨西哥定价每日摘要 — ${digest.date}`
        : `MX Pricing daily digest — ${digest.date}`;

  const deliveries: DigestDeliveryResult[] = [];
  for (const channel of options.channels) {
    if (channel === "email_stub") {
      deliveries.push({
        channel,
        status: "sent_stub",
        to: schedule.email_to,
        subject,
        body: digest.narrative,
      });
      continue;
    }
    if (channel === "webhook_queue") {
      deliveries.push(
        await deliverWebhook({
          tenant_id: tenantId,
          to: schedule.email_to,
          subject,
          body: digest.narrative,
        })
      );
      continue;
    }
    if (channel === "smtp_queue") {
      deliveries.push(
        await deliverSmtpDigest({
          tenant_id: tenantId,
          to: schedule.email_to,
          subject,
          body: digest.narrative,
        })
      );
    }
  }
  return { date: digest.date, digest, deliveries };
}

export async function processDigestQueue(
  deps: {
    catalog: CatalogRepository;
    reconciliationAlerts: ReconciliationAlertRepository;
    agentAudit: AgentToolAuditRepository;
  },
  tenantId: string,
  limit = 5
): Promise<{ processed: DigestQueuedJob[] }> {
  const maxAttempts = Number(process.env.DIGEST_MAX_ATTEMPTS ?? "3");
  const pending = queue.filter(
    (j) =>
      j.tenant_id === tenantId &&
      (j.status === "queued" ||
        (j.status === "failed" && j.attempts < maxAttempts))
  );
  const batch = pending.slice(0, limit);
  const processed: DigestQueuedJob[] = [];

  for (const job of batch) {
    job.status = "processing";
    job.updated_at = new Date().toISOString();
    try {
      if (job.simulate_poison) {
        throw new Error("POISON_MESSAGE");
      }
      const result = await runDigestDeliveries(deps, tenantId, job.locale, {
        date: job.date ?? undefined,
        channels: job.channels,
      });
      job.status = "completed";
      job.result = result;
      job.error = null;
    } catch (e) {
      job.attempts += 1;
      job.error = String(e);
      const maxAttempts = Number(process.env.DIGEST_MAX_ATTEMPTS ?? "3");
      if (job.attempts >= maxAttempts) {
        job.status = "dead_letter";
      } else {
        job.status = "failed";
      }
    }
    job.updated_at = new Date().toISOString();
    processed.push(job);
  }
  return { processed };
}

export function resetDigestJobQueueForTests(): void {
  queue.length = 0;
  queueSeq = 0;
}

