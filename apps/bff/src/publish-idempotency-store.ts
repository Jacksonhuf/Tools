import type { SalesChannel } from "@mx-pricing/channel-adapters";

export type StoredPublishOutcome =
  | {
      publish_status: "published";
      channel_price_mxn: number;
      version_id: string;
      retried?: boolean;
      channel: SalesChannel;
    }
  | { publish_status: "failed"; error_code: string; rule_frozen?: boolean };

const records = new Map<string, StoredPublishOutcome>();

export function buildPublishIdempotencyKey(
  tenantId: string,
  listingId: string,
  idempotencyKey: string
): string {
  return `${tenantId}:${listingId}:${idempotencyKey}`;
}

export function getStoredPublishOutcome(
  compositeKey: string
): StoredPublishOutcome | undefined {
  return records.get(compositeKey);
}

export function storePublishOutcome(
  compositeKey: string,
  outcome: StoredPublishOutcome
): void {
  records.set(compositeKey, outcome);
}

export function resetPublishIdempotencyForTests(): void {
  records.clear();
}
