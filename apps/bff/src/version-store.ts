/** Append-only in-memory versions for MVP (SDD §5.5) — replaced by PostgreSQL in Loop 3+ */

export type VersionState = "suggested" | "pending" | "active" | "superseded";

export type ChannelPublishStatus = "published" | "failed" | "skipped";

export interface PriceVersionRecord {
  id: string;
  sku_id: string;
  channel: string;
  state: VersionState;
  publish_price_mxn: number;
  created_at: string;
  channel_publish_status?: ChannelPublishStatus;
}

let versionSeq = 0;
const versions: PriceVersionRecord[] = [];

export function listVersions(skuId: string): PriceVersionRecord[] {
  return versions.filter((v) => v.sku_id === skuId);
}

export function countVersions(): number {
  return versions.length;
}

export function createVersion(input: {
  sku_id: string;
  channel: string;
  state: VersionState;
  publish_price_mxn: number;
}): PriceVersionRecord {
  versionSeq += 1;
  const record: PriceVersionRecord = {
    id: `ver-${versionSeq}`,
    ...input,
    created_at: new Date().toISOString(),
  };
  if (input.state === "active") {
    for (const v of versions) {
      if (v.sku_id === input.sku_id && v.channel === input.channel && v.state === "active") {
        v.state = "superseded";
      }
    }
  }
  versions.push(record);
  return record;
}

export function getVersionById(
  versionId: string
): PriceVersionRecord | undefined {
  return versions.find((v) => v.id === versionId);
}

export function updateVersionState(
  versionId: string,
  expectedState: VersionState,
  newState: VersionState
): PriceVersionRecord | undefined {
  const v = versions.find((x) => x.id === versionId);
  if (!v || v.state !== expectedState) {
    return undefined;
  }
  v.state = newState;
  return v;
}

export function setVersionChannelPublishStatus(
  versionId: string,
  status: ChannelPublishStatus
): void {
  const v = versions.find((x) => x.id === versionId);
  if (v) {
    v.channel_publish_status = status;
  }
}

export function resetVersionsForTests(): void {
  versions.length = 0;
  versionSeq = 0;
}
