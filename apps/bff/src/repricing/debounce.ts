import {
  getDebounceBackend,
  type CompetitorPriceChangedPayload,
} from "./debounce-backend.js";
import { resetMemoryDebounceWindows } from "./debounce-memory.js";

export type { CompetitorPriceChangedPayload } from "./debounce-backend.js";

export async function recordCompetitorPriceChange(input: {
  listing_id: string;
  channel: CompetitorPriceChangedPayload["channel"];
  offer_id: string;
  previous_effective: number | null;
  current_effective: number;
  observation_id: string;
  observed_at: string;
}): Promise<void> {
  await getDebounceBackend().record(input);
}

export async function flushDebounce(
  listingId: string
): Promise<CompetitorPriceChangedPayload | null> {
  return getDebounceBackend().flush(listingId);
}

export function resetDebounceForTests(): void {
  resetMemoryDebounceWindows();
  void getDebounceBackend().resetForTests();
}

export function getDebounceStatus() {
  const backend = getDebounceBackend();
  return {
    driver: backend.driver,
    redis_url_configured: Boolean(process.env.REDIS_URL?.trim()),
    debounce_ms: Number(process.env.REPRICING_DEBOUNCE_MS ?? 5 * 60 * 1000),
  };
}
