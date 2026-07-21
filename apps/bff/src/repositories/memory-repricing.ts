import type {
  IngestScheduleRecord,
  RepricingEventRecord,
  RepricingRepository,
} from "./repricing-types.js";

let eventSeq = 0;
const events = new Map<string, RepricingEventRecord>();
const dedupeKeys = new Set<string>();
const schedules = new Map<string, IngestScheduleRecord>();

export class MemoryRepricingRepository implements RepricingRepository {
  readonly driver = "memory" as const;

  async enqueueEvent(input: {
    tenant_id: string;
    listing_id: string;
    channel: string;
    type: string;
    payload: Record<string, unknown>;
    dedupe_key?: string;
  }): Promise<RepricingEventRecord> {
    if (input.dedupe_key && dedupeKeys.has(input.dedupe_key)) {
      const existing = [...events.values()].find(
        (e) => e.dedupe_key === input.dedupe_key
      );
      if (existing) {
        return existing;
      }
    }
    eventSeq += 1;
    const id = `revt-${eventSeq}`;
    const record: RepricingEventRecord = {
      id,
      tenant_id: input.tenant_id,
      listing_id: input.listing_id,
      channel: input.channel,
      type: input.type,
      status: "pending",
      payload: input.payload,
      dedupe_key: input.dedupe_key ?? null,
      processed_at: null,
      created_at: new Date().toISOString(),
    };
    events.set(id, record);
    if (input.dedupe_key) {
      dedupeKeys.add(input.dedupe_key);
    }
    return record;
  }

  async getEvent(eventId: string): Promise<RepricingEventRecord | undefined> {
    return events.get(eventId);
  }

  async listEvents(
    tenantId: string,
    listingId: string,
    limit = 50
  ): Promise<RepricingEventRecord[]> {
    return [...events.values()]
      .filter((e) => e.tenant_id === tenantId && e.listing_id === listingId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }

  async markProcessed(
    eventId: string,
    dedupe_key: string
  ): Promise<RepricingEventRecord | undefined> {
    const e = events.get(eventId);
    if (!e) return undefined;
    if (e.status === "processed") {
      return e;
    }
    const updated: RepricingEventRecord = {
      ...e,
      status: "processed",
      dedupe_key,
      processed_at: new Date().toISOString(),
    };
    events.set(eventId, updated);
    dedupeKeys.add(dedupe_key);
    return updated;
  }

  async getIngestSchedule(
    listingId: string
  ): Promise<IngestScheduleRecord | undefined> {
    return schedules.get(listingId);
  }

  async upsertIngestSchedule(input: {
    listing_id: string;
    tier: "T0" | "T1" | "T2";
    next_run_at: string;
  }): Promise<IngestScheduleRecord> {
    const record: IngestScheduleRecord = {
      listing_id: input.listing_id,
      tier: input.tier,
      next_run_at: input.next_run_at,
      updated_at: new Date().toISOString(),
    };
    schedules.set(input.listing_id, record);
    return record;
  }

  resetForTests(): void {
    events.clear();
    dedupeKeys.clear();
    schedules.clear();
    eventSeq = 0;
  }
}
