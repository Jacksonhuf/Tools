import type { StoredPublishOutcome } from "./publish-idempotency-types.js";
import {
  getPublishIdempotencyRepository,
  setPublishIdempotencyRepository,
} from "./repositories/publish-idempotency-index.js";

export type { StoredPublishOutcome } from "./publish-idempotency-types.js";
export {
  getPublishIdempotencyRepository,
  setPublishIdempotencyRepository,
};

export function buildPublishIdempotencyKey(
  tenantId: string,
  listingId: string,
  idempotencyKey: string
): string {
  return `${tenantId}:${listingId}:${idempotencyKey}`;
}

export async function getStoredPublishOutcome(
  compositeKey: string
): Promise<StoredPublishOutcome | undefined> {
  return getPublishIdempotencyRepository().get(compositeKey);
}

export async function storePublishOutcome(
  compositeKey: string,
  tenantId: string,
  outcome: StoredPublishOutcome
): Promise<void> {
  await getPublishIdempotencyRepository().set(compositeKey, tenantId, outcome);
}

export async function resetPublishIdempotencyForTests(): Promise<void> {
  await getPublishIdempotencyRepository().resetForTests();
}
