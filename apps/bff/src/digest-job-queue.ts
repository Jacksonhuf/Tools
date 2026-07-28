import type { AppLocale } from "@mx-pricing/i18n-format";
import { buildDailyAgentDigest } from "./agent-digest-service.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";
import { getDigestSchedule } from "./agent-digest-dispatch.js";
import { deliverSmtpDigest } from "./smtp-digest-adapter.js";
import { getDigestJobRepository } from "./repositories/digest-job-index.js";

export type {
  DigestDeliveryChannel,
  DigestDeliveryStatus,
  DigestQueuedJob,
  DigestDeliveryResult,
  DigestDispatchResult,
} from "./digest-job-queue-types.js";

import type {
  DigestDeliveryChannel,
  DigestDeliveryResult,
  DigestDispatchResult,
  DigestQueuedJob,
} from "./digest-job-queue-types.js";

export async function listDigestQueuedJobs(
  tenantId: string,
  limit = 20
): Promise<DigestQueuedJob[]> {
  return getDigestJobRepository().list(tenantId, limit);
}

export async function getDigestQueuedJob(
  tenantId: string,
  jobId: string
): Promise<DigestQueuedJob | undefined> {
  return getDigestJobRepository().get(tenantId, jobId);
}

export async function listDigestDeadLetterJobs(
  tenantId: string,
  limit = 20
): Promise<DigestQueuedJob[]> {
  return getDigestJobRepository().listDeadLetter(tenantId, limit);
}

export async function digestQueueSummary(tenantId: string) {
  return getDigestJobRepository().summary(tenantId);
}

export async function enqueueDailyDigestJob(input: {
  tenant_id: string;
  locale: AppLocale;
  date?: string;
  channels?: DigestDeliveryChannel[];
  simulate_poison?: boolean;
}): Promise<DigestQueuedJob> {
  return getDigestJobRepository().enqueue(input);
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
  const repo = getDigestJobRepository();
  const maxAttempts = Number(process.env.DIGEST_MAX_ATTEMPTS ?? "3");
  const batch = await repo.listPending(tenantId, limit, maxAttempts);
  const processed: DigestQueuedJob[] = [];

  for (const job of batch) {
    job.status = "processing";
    job.updated_at = new Date().toISOString();
    await repo.save(job);
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
      job.status =
        job.attempts >= maxAttempts ? "dead_letter" : "failed";
    }
    job.updated_at = new Date().toISOString();
    await repo.save(job);
    processed.push(job);
  }
  return { processed };
}

export function resetDigestJobQueueForTests(): void {
  void getDigestJobRepository().resetForTests();
}

export function getDigestJobStoreStatus() {
  return { driver: getDigestJobRepository().driver };
}
