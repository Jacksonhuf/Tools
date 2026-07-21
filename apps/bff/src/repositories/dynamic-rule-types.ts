export type RepricingAction = "suggest" | "pending" | "auto_pending" | "auto_active";

export interface OffsetJson {
  type: "PERCENT" | "FIXED_MXN";
  value: number;
}

export interface DynamicRuleRecord {
  id: string;
  listing_id: string;
  enabled: boolean;
  action: RepricingAction;
  anchor_type: string;
  offset: OffsetJson;
  triggers_json: Record<string, unknown> | null;
  cooldown_min: number;
  daily_limit: number;
  min_gap_mxn: number;
  tier: string | null;
  frozen: boolean;
  business_hours_only: boolean;
  updated_at: string;
}

export interface DynamicRuleRepository {
  readonly driver: "memory" | "postgres";
  getRule(listingId: string): Promise<DynamicRuleRecord | undefined>;
  upsertRule(
    listingId: string,
    patch: Partial<
      Omit<DynamicRuleRecord, "id" | "listing_id" | "updated_at">
    >
  ): Promise<DynamicRuleRecord>;
  unfreeze(listingId: string): Promise<DynamicRuleRecord | undefined>;
  resetForTests?(): void;
}

export interface ListingStaleState {
  competitor_stale_frozen: boolean;
  competitor_stale_since: string | null;
}

export interface ListingIngestGuardState {
  ingest_failed: boolean;
  ingest_failed_at: string | null;
}

export interface ListingHealthRepository {
  readonly driver: "memory" | "postgres";
  getStale(listingId: string): Promise<ListingStaleState>;
  setStale(
    listingId: string,
    frozen: boolean,
    since?: string | null
  ): Promise<void>;
  getIngestGuard(listingId: string): Promise<ListingIngestGuardState>;
  setIngestFailed(listingId: string, failed: boolean): Promise<void>;
  resetForTests?(): void;
}
