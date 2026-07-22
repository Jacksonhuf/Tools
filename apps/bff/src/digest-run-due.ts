import type { AppLocale } from "@mx-pricing/i18n-format";
import type { CatalogRepository } from "./repositories/index.js";
import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";
import {
  dispatchDailyDigest,
  getDigestSchedule,
  type DigestDispatchRecord,
} from "./agent-digest-dispatch.js";
import type { DailyAgentDigest } from "./agent-digest-service.js";

export async function runDueDigestDispatch(
  deps: {
    catalog: CatalogRepository;
    reconciliationAlerts: ReconciliationAlertRepository;
    agentAudit: AgentToolAuditRepository;
  },
  tenantId: string,
  locale: AppLocale,
  options?: { force?: boolean; date?: string }
): Promise<
  | { skipped: true }
  | {
      skipped: false;
      record: DigestDispatchRecord;
      digest: DailyAgentDigest;
      schedule: ReturnType<typeof getDigestSchedule>;
    }
> {
  const schedule = getDigestSchedule(tenantId);
  if (!schedule.enabled && !options?.force) {
    return { skipped: true };
  }
  const { record, digest } = await dispatchDailyDigest(
    deps,
    tenantId,
    locale,
    { date: options?.date }
  );
  return {
    skipped: false,
    record,
    digest,
    schedule: getDigestSchedule(tenantId),
  };
}
