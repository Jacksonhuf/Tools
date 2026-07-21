import type { SalesChannel } from "@mx-pricing/channel-adapters";

export interface CompetitorPriceChangedPayload {
  listing_id: string;
  channel: SalesChannel;
  offer_id: string;
  previous_effective: number | null;
  current_effective: number;
  observed_at: string;
  observation_id: string;
  debounce_ticks?: number;
}

function debounceMs(): number {
  const raw = process.env.REPRICING_DEBOUNCE_MS;
  if (raw !== undefined) {
    return Number(raw);
  }
  return 5 * 60 * 1000;
}

interface DebounceEntry {
  listing_id: string;
  channel: SalesChannel;
  offer_id: string;
  first_previous: number | null;
  last_current: number;
  last_observation_id: string;
  last_observed_at: string;
  tick_count: number;
  expires_at: number;
}

const windows = new Map<string, DebounceEntry>();

export function recordCompetitorPriceChange(input: {
  listing_id: string;
  channel: SalesChannel;
  offer_id: string;
  previous_effective: number | null;
  current_effective: number;
  observation_id: string;
  observed_at: string;
}): void {
  const now = Date.now();
  const ms = debounceMs();
  const existing = windows.get(input.listing_id);
  if (!existing || now > existing.expires_at) {
    windows.set(input.listing_id, {
      listing_id: input.listing_id,
      channel: input.channel,
      offer_id: input.offer_id,
      first_previous: input.previous_effective,
      last_current: input.current_effective,
      last_observation_id: input.observation_id,
      last_observed_at: input.observed_at,
      tick_count: 1,
      expires_at: now + ms,
    });
    return;
  }
  existing.tick_count += 1;
  existing.last_current = input.current_effective;
  existing.last_observation_id = input.observation_id;
  existing.last_observed_at = input.observed_at;
  existing.offer_id = input.offer_id;
  existing.expires_at = now + ms;
}

export function flushDebounce(
  listingId: string
): CompetitorPriceChangedPayload | null {
  const entry = windows.get(listingId);
  if (!entry) {
    return null;
  }
  windows.delete(listingId);
  return {
    listing_id: entry.listing_id,
    channel: entry.channel,
    offer_id: entry.offer_id,
    previous_effective: entry.first_previous,
    current_effective: entry.last_current,
    observed_at: entry.last_observed_at,
    observation_id: entry.last_observation_id,
    debounce_ticks: entry.tick_count,
  };
}

export function resetDebounceForTests(): void {
  windows.clear();
}
