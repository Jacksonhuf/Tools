export type RepricingEventStatus = "pending" | "processed" | "skipped";

export interface RepricingEventRecord {
  id: string;
  tenant_id: string;
  listing_id: string;
  channel: string;
  type: string;
  status: RepricingEventStatus;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface IngestScheduleRecord {
  listing_id: string;
  tier: "T0" | "T1" | "T2";
  next_run_at: string;
  updated_at: string;
}

export interface RepricingRepository {
  readonly driver: "memory" | "postgres";
  enqueueEvent(input: {
    tenant_id: string;
    listing_id: string;
    channel: string;
    type: string;
    payload: Record<string, unknown>;
    dedupe_key?: string;
  }): Promise<RepricingEventRecord>;
  getEvent(eventId: string): Promise<RepricingEventRecord | undefined>;
  listEvents(
    tenantId: string,
    listingId: string,
    limit?: number
  ): Promise<RepricingEventRecord[]>;
  markProcessed(
    eventId: string,
    dedupe_key: string
  ): Promise<RepricingEventRecord | undefined>;
  getIngestSchedule(
    listingId: string
  ): Promise<IngestScheduleRecord | undefined>;
  upsertIngestSchedule(input: {
    listing_id: string;
    tier: "T0" | "T1" | "T2";
    next_run_at: string;
  }): Promise<IngestScheduleRecord>;
  resetForTests?(): void;
}
