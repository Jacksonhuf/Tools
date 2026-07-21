/** Append-only in-memory versions for MVP (SDD §5.5) — replaced by PostgreSQL in Loop 3+ */

import type { VersionAuditFields } from "./version-audit-types.js";

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
  trigger_event_id?: string | null;
  dynamic_rule_id?: string | null;
  competitor_snapshot_ids?: string[];
  floor_snapshot_id?: string | null;
  cost_snapshot_id?: string | null;
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
} & VersionAuditFields): PriceVersionRecord {
  versionSeq += 1;
  const record: PriceVersionRecord = {
    id: `ver-${versionSeq}`,
    sku_id: input.sku_id,
    channel: input.channel,
    state: input.state,
    publish_price_mxn: input.publish_price_mxn,
    created_at: new Date().toISOString(),
    trigger_event_id: input.trigger_event_id ?? null,
    dynamic_rule_id: input.dynamic_rule_id ?? null,
    competitor_snapshot_ids: input.competitor_snapshot_ids ?? [],
    floor_snapshot_id: input.floor_snapshot_id ?? null,
    cost_snapshot_id: input.cost_snapshot_id ?? null,
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
