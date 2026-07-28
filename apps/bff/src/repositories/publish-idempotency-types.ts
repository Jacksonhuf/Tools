import type { StoredPublishOutcome } from "../publish-idempotency-types.js";

export interface PublishIdempotencyRepository {
  readonly driver: "memory" | "postgres";
  get(compositeKey: string): Promise<StoredPublishOutcome | undefined>;
  set(compositeKey: string, tenantId: string, outcome: StoredPublishOutcome): Promise<void>;
  resetForTests(): Promise<void>;
}
