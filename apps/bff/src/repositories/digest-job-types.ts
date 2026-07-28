import type { AppLocale } from "@mx-pricing/i18n-format";
import type {
  DigestDeliveryChannel,
  DigestDispatchResult,
  DigestQueuedJob,
} from "../digest-job-queue-types.js";

export interface DigestJobRepository {
  readonly driver: "memory" | "postgres";
  list(tenantId: string, limit?: number): Promise<DigestQueuedJob[]>;
  get(tenantId: string, jobId: string): Promise<DigestQueuedJob | undefined>;
  listDeadLetter(tenantId: string, limit?: number): Promise<DigestQueuedJob[]>;
  summary(tenantId: string): Promise<{
    total: number;
    queued: number;
    failed: number;
    dead_letter: number;
  }>;
  enqueue(input: {
    tenant_id: string;
    locale: AppLocale;
    date?: string;
    channels?: DigestDeliveryChannel[];
    simulate_poison?: boolean;
  }): Promise<DigestQueuedJob>;
  listPending(
    tenantId: string,
    limit: number,
    maxAttempts: number
  ): Promise<DigestQueuedJob[]>;
  save(job: DigestQueuedJob): Promise<DigestQueuedJob>;
  resetForTests(): Promise<void>;
}

export type { DigestQueuedJob, DigestDispatchResult, DigestDeliveryChannel };
