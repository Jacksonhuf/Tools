const staleByListing = new Map<
  string,
  { frozen: boolean; since: string | null }
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

  resetForTests(): void {
    staleByListing.clear();
  }
}
