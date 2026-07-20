/** Append-only in-memory versions for MVP (SDD §5.5) — replaced by PostgreSQL in Loop 3+ */

export type VersionState = "suggested" | "pending" | "active" | "superseded";

export interface PriceVersionRecord {
  id: string;
  sku_id: string;
  channel: string;
  state: VersionState;
  publish_price_mxn: number;
  created_at: string;
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

export function resetVersionsForTests(): void {
  versions.length = 0;
  versionSeq = 0;
}
