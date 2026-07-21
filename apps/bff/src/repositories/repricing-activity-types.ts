export interface RepricingActivityRepository {
  readonly driver: "memory" | "postgres";
  recordApply(listingId: string, at?: string): Promise<void>;
  lastApplyAt(listingId: string): Promise<string | null>;
  countAppliesSince(listingId: string, since: Date): Promise<number>;
  resetForTests?(): void;
}
