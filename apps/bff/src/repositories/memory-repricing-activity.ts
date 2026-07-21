import type { RepricingActivityRepository } from "./repricing-activity-types.js";

let seq = 0;
const rows: Array<{ id: string; listing_id: string; created_at: string }> = [];

export class MemoryRepricingActivityRepository
  implements RepricingActivityRepository
{
  readonly driver = "memory" as const;

  async recordApply(listingId: string, at?: string): Promise<void> {
    seq += 1;
    rows.push({
      id: `ract-${seq}`,
      listing_id: listingId,
      created_at: at ?? new Date().toISOString(),
    });
  }

  async lastApplyAt(listingId: string): Promise<string | null> {
    const filtered = rows
      .filter((r) => r.listing_id === listingId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    return filtered[0]?.created_at ?? null;
  }

  async countAppliesSince(listingId: string, since: Date): Promise<number> {
    return rows.filter(
      (r) =>
        r.listing_id === listingId && new Date(r.created_at) >= since
    ).length;
  }

  resetForTests(): void {
    rows.length = 0;
    seq = 0;
  }
}
