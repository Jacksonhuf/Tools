import type { AppLocale } from "@mx-pricing/i18n-format";
import type { DailyAgentDigest } from "./agent-digest-service.js";
import { buildDailyAgentDigest } from "./agent-digest-service.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";

export interface DigestScheduleConfig {
  tenant_id: string;
  enabled: boolean;
  cron: string;
  email_to: string;
  timezone: string;
  updated_at: string;
}

export interface DigestDispatchRecord {
  job_id: string;
  tenant_id: string;
  date: string;
  status: "completed";
  created_at: string;
  deliveries: Array<{
    channel: "email_stub";
    status: "sent_stub";
    to: string;
    subject: string;
    body: string;
  }>;
}

const schedules = new Map<string, DigestScheduleConfig>();
const dispatches: DigestDispatchRecord[] = [];
let jobSeq = 0;

const DEFAULT_CRON = "0 8 * * *";

export function getDigestSchedule(tenantId: string): DigestScheduleConfig {
  const existing = schedules.get(tenantId);
  if (existing) return existing;
  const now = new Date().toISOString();
  return {
    tenant_id: tenantId,
    enabled: false,
    cron: DEFAULT_CRON,
    email_to: "ops@tenant.local",
    timezone: "America/Mexico_City",
    updated_at: now,
  };
}

export function upsertDigestSchedule(
  tenantId: string,
  patch: Partial<
    Pick<DigestScheduleConfig, "enabled" | "cron" | "email_to" | "timezone">
  >
): DigestScheduleConfig {
  const base = getDigestSchedule(tenantId);
  const next: DigestScheduleConfig = {
    ...base,
    ...patch,
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  };
  schedules.set(tenantId, next);
  return next;
}

export function listDigestDispatches(
  tenantId: string,
  limit = 20
): DigestDispatchRecord[] {
  return dispatches
    .filter((d) => d.tenant_id === tenantId)
    .slice(-limit)
    .reverse();
}

export async function dispatchDailyDigest(
  deps: {
    catalog: CatalogRepository;
    reconciliationAlerts: ReconciliationAlertRepository;
    agentAudit: AgentToolAuditRepository;
  },
  tenantId: string,
  locale: AppLocale,
  options?: { date?: string; channels?: Array<"email_stub"> }
): Promise<{ record: DigestDispatchRecord; digest: DailyAgentDigest }> {
  const schedule = getDigestSchedule(tenantId);
  const digest = await buildDailyAgentDigest(
    deps,
    tenantId,
    locale,
    options?.date
  );
  jobSeq += 1;
  const job_id = `digest-job-${jobSeq}`;
  const channels = options?.channels?.length
    ? options.channels
    : (["email_stub"] as const);
  const deliveries = channels.map((channel) => {
    if (channel !== "email_stub") {
      throw new Error("UNSUPPORTED_CHANNEL");
    }
    const subject =
      locale === "es-MX"
        ? `Resumen diario MX Pricing — ${digest.date}`
        : locale === "zh-CN"
          ? `墨西哥定价每日摘要 — ${digest.date}`
          : `MX Pricing daily digest — ${digest.date}`;
    return {
      channel: "email_stub" as const,
      status: "sent_stub" as const,
      to: schedule.email_to,
      subject,
      body: digest.narrative,
    };
  });
  const record: DigestDispatchRecord = {
    job_id,
    tenant_id: tenantId,
    date: digest.date,
    status: "completed",
    created_at: new Date().toISOString(),
    deliveries,
  };
  dispatches.push(record);
  if (schedules.has(tenantId)) {
    schedules.set(tenantId, {
      ...schedule,
      updated_at: record.created_at,
    });
  }
  return { record, digest };
}

export function resetDigestDispatchForTests(): void {
  schedules.clear();
  dispatches.length = 0;
  jobSeq = 0;
}
