const staleByListing = new Map<
  string,
  { frozen: boolean; since: string | null }
>();

const ingestFailedByListing = new Map<
  string,
  { failed: boolean; at: string | null }
>();

export class MemoryListingHealthRepository {
  readonly driver = "memory" as const;

  async getStale(listingId: string) {
    const s = staleByListing.get(listingId);
    return {
      competitor_stale_frozen: s?.frozen ?? false,
      competitor_stale_since: s?.since ?? null,
    };
  }

  async setStale(
    listingId: string,
    frozen: boolean,
    since?: string | null
  ): Promise<void> {
    staleByListing.set(listingId, {
      frozen,
      since: frozen ? (since ?? new Date().toISOString()) : null,
    });
  }

  async getIngestGuard(listingId: string): Promise<{
    ingest_failed: boolean;
    ingest_failed_at: string | null;
  }> {
    const g = ingestFailedByListing.get(listingId);
    return {
      ingest_failed: g?.failed ?? false,
      ingest_failed_at: g?.at ?? null,
    };
  }

  async setIngestFailed(listingId: string, failed: boolean): Promise<void> {
    ingestFailedByListing.set(listingId, {
      failed,
      at: failed ? new Date().toISOString() : null,
    });
  }

  resetForTests(): void {
    staleByListing.clear();
    ingestFailedByListing.clear();
  }
}
