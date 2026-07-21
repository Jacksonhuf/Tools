import type { ListingPullAdapter } from "@mx-pricing/channel-adapters";
import { computeCompetitive, computeFloorPrice } from "@mx-pricing/pricing-engine";
import type { CatalogRepository } from "../repositories/index.js";
import type { CompetitorRepository } from "../repositories/competitor-index.js";
import type {
  RepricingEventRecord,
  RepricingRepository,
} from "../repositories/repricing-types.js";
import type {
  DynamicRuleRepository,
  ListingHealthRepository,
} from "../repositories/dynamic-rule-types.js";
import type { RepricingActivityRepository } from "../repositories/repricing-activity-types.js";
import { computeEffectivePrice } from "../competitor-normalize.js";
import {
  flushDebounce,
  recordCompetitorPriceChange,
  type CompetitorPriceChangedPayload,
} from "./debounce.js";
import { nextRunFromNow, type IngestTier } from "./tier.js";
import { evaluateListingStale } from "./stale.js";
import { checkDynamicRepricingGuards } from "./guards.js";
import { versionStateForAction } from "./action.js";

export class IngestFailedError extends Error {
  constructor() {
    super("INGEST_FAILED");
    this.name = "IngestFailedError";
  }
}

export async function ensureIngestSchedule(
  repricing: RepricingRepository,
  listingId: string,
  tier: IngestTier = "T1"
) {
  const existing = await repricing.getIngestSchedule(listingId);
  if (existing) return existing;
  return repricing.upsertIngestSchedule({
    listing_id: listingId,
    tier,
    next_run_at: nextRunFromNow(tier),
  });
}

export async function notifyObservationChange(
  _repricing: RepricingRepository,
  _tenantId: string,
  input: {
    listing_id: string;
    channel: CompetitorPriceChangedPayload["channel"];
    offer_id: string;
    previous_effective: number | null;
    observation: {
      id: string;
      effective_price: number;
      observed_at: string;
    };
  }
): Promise<void> {
  if (
    input.previous_effective !== null &&
    input.previous_effective === input.observation.effective_price
  ) {
    return;
  }
  recordCompetitorPriceChange({
    listing_id: input.listing_id,
    channel: input.channel,
    offer_id: input.offer_id,
    previous_effective: input.previous_effective,
    current_effective: input.observation.effective_price,
    observation_id: input.observation.id,
    observed_at: input.observation.observed_at,
  });
}

export async function flushListingDebounce(
  repricing: RepricingRepository,
  tenantId: string,
  listingId: string
): Promise<RepricingEventRecord | null> {
  const payload = flushDebounce(listingId);
  if (!payload) {
    return null;
  }
  const dedupe_key = `cpc:${listingId}:${payload.observation_id}`;
  return repricing.enqueueEvent({
    tenant_id: tenantId,
    listing_id: listingId,
    channel: payload.channel,
    type: "CompetitorPriceChanged",
    payload: payload as unknown as Record<string, unknown>,
    dedupe_key,
  });
}

export async function runMockIngest(
  catalog: CatalogRepository,
  competitors: CompetitorRepository,
  repricing: RepricingRepository,
  listingHealth: ListingHealthRepository,
  listingAdapter: ListingPullAdapter,
  tenantId: string,
  listingId: string
): Promise<{ observations_created: number; tier: IngestTier }> {
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const schedule = await ensureIngestSchedule(repricing, listingId);
  const offers = await competitors.listOffers(listingId);
  let created = 0;
  try {
    for (const offer of offers) {
      const prev = await competitors.latestObservation(offer.id);
      const snap = await listingAdapter.pullListing(
        {
          shop_id: "ingest-mock",
          channel: offer.channel,
          external_seller_id: "INGEST",
        },
        offer.external_ref
      );
      const effective = computeEffectivePrice({
        sale_price: snap.price_mxn,
        include_shipping: false,
      });
      if (prev && prev.effective_price === effective) {
        continue;
      }
      const observation = await competitors.addObservation({
        offer_id: offer.id,
        observed_at: snap.synced_at,
        sale_price: snap.price_mxn,
        effective_price: effective,
        raw_json: { source: "mock-ingest" },
      });
      created += 1;
      await notifyObservationChange(repricing, tenantId, {
        listing_id: listingId,
        channel: offer.channel,
        offer_id: offer.id,
        previous_effective: prev?.effective_price ?? null,
        observation: {
          id: observation.id,
          effective_price: observation.effective_price,
          observed_at: observation.observed_at,
        },
      });
    }
    await listingHealth.setIngestFailed(listingId, false);
  } catch (e) {
    await listingHealth.setIngestFailed(listingId, true);
    throw new IngestFailedError();
  }
  await repricing.upsertIngestSchedule({
    listing_id: listingId,
    tier: schedule.tier,
    next_run_at: nextRunFromNow(schedule.tier),
  });
  return { observations_created: created, tier: schedule.tier };
}

export async function processRepricingEvent(
  catalog: CatalogRepository,
  competitors: CompetitorRepository,
  repricing: RepricingRepository,
  dynamicRules: DynamicRuleRepository,
  listingHealth: ListingHealthRepository,
  repricingActivity: RepricingActivityRepository,
  tenantId: string,
  eventId: string
): Promise<
  | { version_id: string; state: string; skipped?: false }
  | { skipped: true; reason: string }
> {
  const event = await repricing.getEvent(eventId);
  if (!event || event.tenant_id !== tenantId) {
    throw new Error("EVENT_NOT_FOUND");
  }
  if (event.status === "processed") {
    return { skipped: true, reason: "ALREADY_PROCESSED" };
  }
  const listing = await catalog.getListing(tenantId, event.listing_id);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  await evaluateListingStale(competitors, listingHealth, event.listing_id);
  const staleState = await listingHealth.getStale(event.listing_id);
  if (staleState.competitor_stale_frozen) {
    return { skipped: true, reason: "STALE_COMPETITOR_DATA" };
  }

  let rule = await dynamicRules.getRule(event.listing_id);
  if (!rule) {
    rule = await dynamicRules.upsertRule(event.listing_id, {});
  }
  if (!rule.enabled) {
    return { skipped: true, reason: "RULE_DISABLED" };
  }
  if (rule.frozen) {
    return { skipped: true, reason: "RULE_FROZEN" };
  }

  const guardCode = await checkDynamicRepricingGuards(
    repricingActivity,
    event.listing_id,
    rule
  );
  if (guardCode) {
    return { skipped: true, reason: guardCode };
  }

  const offers = await competitors.listOffers(event.listing_id);
  const withLatest = await Promise.all(
    offers.map(async (o) => {
      const latest = await competitors.latestObservation(o.id);
      return {
        ...o,
        latest_effective_mxn: latest?.effective_price ?? null,
      };
    })
  );
  const observations = withLatest
    .filter((o) => o.latest_effective_mxn != null)
    .map((o) => ({
      channel: o.channel,
      effective_price_mxn: o.latest_effective_mxn as number,
    }));
  if (observations.length === 0) {
    await repricing.markProcessed(eventId, `proc:${eventId}`);
    return { skipped: true, reason: "NO_ANCHOR" };
  }

  const sku = listing.sku;
  const fee =
    listing.channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
  const floor = computeFloorPrice(
    sku.landed_cost_mxn,
    sku.policy.min_margin_pct,
    fee
  );
  const comp = computeCompetitive({
    pricing_mode: "competitive_with_floor",
    channel: listing.channel,
    floor_price_mxn: floor,
    rounding_rule: { type: "NONE", decimals: 2 },
    anchor_type: rule.anchor_type,
    competitor_observations: observations,
    offset:
      rule.offset.type === "FIXED_MXN"
        ? { type: "FIXED_MXN" as const, value: rule.offset.value }
        : { type: "PERCENT" as const, value: rule.offset.value },
  });

  const versions = await catalog.listVersions(sku.id);
  const active = versions.find(
    (v) => v.state === "active" && v.channel === listing.channel
  );
  if (
    active &&
    rule.min_gap_mxn > 0 &&
    Math.abs(comp.publish_price_mxn - active.publish_price_mxn) < rule.min_gap_mxn
  ) {
    return { skipped: true, reason: "MIN_GAP" };
  }

  const versionState = versionStateForAction(rule.action);
  const ingestGuard = await listingHealth.getIngestGuard(event.listing_id);
  if (
    versionState === "active" &&
    active &&
    comp.publish_price_mxn < active.publish_price_mxn &&
    ingestGuard.ingest_failed
  ) {
    return { skipped: true, reason: "INGEST_FAILED_NO_DOWNGRADE" };
  }

  const version = await catalog.createVersion({
    tenant_id: tenantId,
    sku_id: sku.id,
    channel: listing.channel,
    state: versionState,
    publish_price_mxn: comp.publish_price_mxn,
    reason: `repricing:${eventId}`,
  });
  await repricing.markProcessed(eventId, `proc:${eventId}`);
  await repricingActivity.recordApply(event.listing_id);
  return { version_id: version.id, state: version.state };
}
