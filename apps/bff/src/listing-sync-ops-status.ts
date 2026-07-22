import { listListingSyncJobsForTenant } from "./listing-sync-journal.js";
import { getListingSyncSchedule } from "./listing-sync-schedule.js";

export function buildListingSyncOpsStatus(tenantId: string, sampleLimit = 50) {
  const schedule = getListingSyncSchedule(tenantId);
  const recent = listListingSyncJobsForTenant(tenantId, sampleLimit);
  let ok = 0;
  let failed = 0;
  for (const job of recent) {
    if (job.status === "ok") ok += 1;
    else failed += 1;
  }
  return {
    schedule,
    job_summary: {
      sampled: recent.length,
      ok,
      failed,
      last_finished_at: recent[0]?.finished_at ?? null,
    },
  };
}
