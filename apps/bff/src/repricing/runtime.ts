import { MockChannelListingAdapter } from "@mx-pricing/channel-adapters";
import { computeCompetitive, computeFloorPrice } from "@mx-pricing/pricing-engine";
import type { CatalogRepository } from "../repositories/index.js";
import type { CompetitorRepository } from "../repositories/competitor-index.js";
import type {
  RepricingEventRecord,
  RepricingRepository,
} from "../repositories/repricing-types.js";
import { computeEffectivePrice } from "../competitor-normalize.js";
import { buildCompetitorAnchorSummary } from "../competitor-summary.js";
import {
  flushDebounce,
  recordCompetitorPriceChange,
  type CompetitorPriceChangedPayload,
} from "./debounce.js";
import { nextRunFromNow, type IngestTier } from "./tier.js";

const mockPull = new MockChannelListingAdapter();

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
  for (const offer of offers) {
    const prev = await competitors.latestObservation(offer.id);
    const snap = await mockPull.pullListing(
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
  const anchor = buildCompetitorAnchorSummary(withLatest);
  const match = anchor.median_mxn ?? anchor.min_mxn;
  if (match == null) {
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
    match_price_mxn: match,
    floor_price_mxn: floor,
    rounding_rule: { type: "NONE", decimals: 2 },
  });
  const version = await catalog.createVersion({
    tenant_id: tenantId,
    sku_id: sku.id,
    channel: listing.channel,
    state: "suggested",
    publish_price_mxn: comp.publish_price_mxn,
    reason: `repricing:${eventId}`,
  });
  await repricing.markProcessed(eventId, `proc:${eventId}`);
  return { version_id: version.id, state: version.state };
}
