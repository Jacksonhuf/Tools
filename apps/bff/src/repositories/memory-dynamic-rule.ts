import type {
  DynamicRuleRecord,
  DynamicRuleRepository,
  OffsetJson,
} from "./dynamic-rule-types.js";

const rules = new Map<string, DynamicRuleRecord>();

function defaultRule(listingId: string): DynamicRuleRecord {
  return {
    id: `drule-${listingId}`,
    listing_id: listingId,
    enabled: true,
    action: "suggest",
    anchor_type: "median",
    offset: { type: "PERCENT", value: 0 },
    triggers_json: null,
    cooldown_min: 0,
    daily_limit: 10,
    min_gap_mxn: 5,
    tier: null,
    frozen: false,
    updated_at: new Date().toISOString(),
  };
}

export class MemoryDynamicRuleRepository implements DynamicRuleRepository {
  readonly driver = "memory" as const;

  async getRule(listingId: string): Promise<DynamicRuleRecord | undefined> {
    return rules.get(listingId);
  }

  async upsertRule(
    listingId: string,
    patch: Partial<
      Omit<DynamicRuleRecord, "id" | "listing_id" | "updated_at">
    >
  ): Promise<DynamicRuleRecord> {
    const base = rules.get(listingId) ?? defaultRule(listingId);
    const next: DynamicRuleRecord = {
      ...base,
      ...patch,
      offset: (patch.offset as OffsetJson | undefined) ?? base.offset,
      updated_at: new Date().toISOString(),
    };
    rules.set(listingId, next);
    return next;
  }

  async unfreeze(listingId: string): Promise<DynamicRuleRecord | undefined> {
    const rule = rules.get(listingId);
    if (!rule) {
      return this.upsertRule(listingId, { frozen: false });
    }
    return this.upsertRule(listingId, { frozen: false });
  }

  resetForTests(): void {
    rules.clear();
  }
}
