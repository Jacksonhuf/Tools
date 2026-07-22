export interface ListingSyncJob {
  id: string;
  tenant_id: string;
  listing_id: string;
  shop_id: string;
  external_ref: string;
  status: "ok" | "failed";
  channel_price_mxn: number | null;
  error_code: string | null;
  started_at: string;
  finished_at: string;
}

let seq = 1;
const jobs: ListingSyncJob[] = [];

export function recordListingSyncJob(
  input: Omit<ListingSyncJob, "id" | "started_at" | "finished_at"> & {
    started_at?: string;
    finished_at?: string;
  }
): ListingSyncJob {
  const job: ListingSyncJob = {
    id: `lsync-${seq++}`,
    started_at: input.started_at ?? new Date().toISOString(),
    finished_at: input.finished_at ?? new Date().toISOString(),
    ...input,
  };
  jobs.unshift(job);
  if (jobs.length > 200) jobs.pop();
  return job;
}

export function listListingSyncJobs(
  tenantId: string,
  listingId: string,
  limit = 20
): ListingSyncJob[] {
  return jobs
    .filter((j) => j.tenant_id === tenantId && j.listing_id === listingId)
    .slice(0, limit);
}

export function resetListingSyncJobsForTests(): void {
  jobs.length = 0;
  seq = 1;
}
