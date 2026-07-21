import { getChannelAdapterStatus } from "./channel-adapter-factory.js";
import {
  countChannelSandboxEvents,
  getChannelSandboxStatus,
} from "./channel-sandbox-ledger.js";
import { listDigestQueuedJobs } from "./digest-job-queue.js";
import type { CatalogRepository } from "./repositories/types.js";

export function buildOpsMetricsSnapshot(
  catalog: CatalogRepository,
  tenantId: string
) {
  const sandbox = getChannelSandboxStatus();
  const adapters = getChannelAdapterStatus();
  const digestJobs = listDigestQueuedJobs(tenantId);
  const digestQueued = digestJobs.filter((j) => j.status === "queued").length;
  const digestFailed = digestJobs.filter((j) => j.status === "failed").length;

  return {
    tenant_id: tenantId,
    catalog_driver: catalog.driver,
    channel_sandbox: {
      enabled: sandbox.enabled,
      mode: sandbox.mode,
      event_count: countChannelSandboxEvents(tenantId),
    },
    channel_adapters: {
      driver: adapters.driver,
      ready: adapters.ready,
      publish_http_url_configured: adapters.publish_http_url_configured,
      listing_pull_http_url_configured:
        adapters.listing_pull_http_url_configured,
    },
    digest_queue: {
      total: digestJobs.length,
      queued: digestQueued,
      failed: digestFailed,
    },
    generated_at: new Date().toISOString(),
  };
}
