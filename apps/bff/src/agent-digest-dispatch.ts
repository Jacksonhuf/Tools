import type { AppLocale } from "@mx-pricing/i18n-format";
import type { DailyAgentDigest } from "./agent-digest-service.js";
import {
  runDigestDeliveries,
  type DigestDeliveryChannel,
} from "./digest-job-queue.js";
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
  last_dispatch_at: string | null;
}

export interface DigestDispatchRecord {
  job_id: string;
  tenant_id: string;
  date: string;
  status: "completed";
  created_at: string;
  deliveries: Array<{
    channel: DigestDeliveryChannel;
    status: string;
    to?: string;
    subject?: string;
    body?: string;
    webhook_url?: string | null;
  }>;
}

const schedules = new Map<string, DigestScheduleConfig>();
const dispatches: DigestDispatchRecord[] = [];
let jobSeq = 0;

const DEFAULT_CRON = "0 8 * * *";

import { isValidCronExpression } from "./listing-sync-schedule.js";

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
    last_dispatch_at: null,
  };
}

export function upsertDigestSchedule(
  tenantId: string,
  patch: Partial<
    Pick<DigestScheduleConfig, "enabled" | "cron" | "email_to" | "timezone">
  >
): DigestScheduleConfig {
  const base = getDigestSchedule(tenantId);
  if (patch.cron !== undefined && !isValidCronExpression(patch.cron.trim())) {
    throw new Error("INVALID_CRON_EXPRESSION");
  }
  const next: DigestScheduleConfig = {
    ...base,
    ...patch,
    tenant_id: tenantId,
    cron: patch.cron?.trim() ?? base.cron,
    updated_at: new Date().toISOString(),
    last_dispatch_at: base.last_dispatch_at ?? null,
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
  options?: { date?: string; channels?: DigestDeliveryChannel[] }
): Promise<{ record: DigestDispatchRecord; digest: DailyAgentDigest }> {
  const channels = options?.channels?.length
    ? options.channels
    : (["email_stub"] as DigestDeliveryChannel[]);
  const result = await runDigestDeliveries(deps, tenantId, locale, {
    date: options?.date,
    channels,
  });
  jobSeq += 1;
  const job_id = `digest-job-${jobSeq}`;
  const record: DigestDispatchRecord = {
    job_id,
    tenant_id: tenantId,
    date: result.date,
    status: "completed",
    created_at: new Date().toISOString(),
    deliveries: result.deliveries,
  };
  dispatches.push(record);
  const schedule = getDigestSchedule(tenantId);
  const ranAt = record.created_at;
  schedules.set(tenantId, {
    ...schedule,
    updated_at: ranAt,
    last_dispatch_at: ranAt,
  });
  return { record, digest: result.digest };
}

export function resetDigestDispatchForTests(): void {
  schedules.clear();
  dispatches.length = 0;
  jobSeq = 0;
}
