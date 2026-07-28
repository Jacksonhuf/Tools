import type { StoredPublishOutcome } from "../publish-idempotency-types.js";
import type { PublishIdempotencyRepository } from "./publish-idempotency-types.js";

const records = new Map<string, StoredPublishOutcome>();

export class MemoryPublishIdempotencyRepository
  implements PublishIdempotencyRepository
{
  readonly driver = "memory" as const;

  async get(compositeKey: string): Promise<StoredPublishOutcome | undefined> {
    return records.get(compositeKey);
  }

  async set(
    compositeKey: string,
    _tenantId: string,
    outcome: StoredPublishOutcome
  ): Promise<void> {
    records.set(compositeKey, outcome);
  }

  async resetForTests(): Promise<void> {
    records.clear();
  }
}
