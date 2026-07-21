export type IngestTier = "T0" | "T1" | "T2";

const TIER_MS: Record<IngestTier, number> = {
  T0: 15 * 60 * 1000,
  T1: 60 * 60 * 1000,
  T2: 24 * 60 * 60 * 1000,
};

export function tierIntervalMs(tier: IngestTier): number {
  return TIER_MS[tier];
}

export function nextRunFromNow(tier: IngestTier, from = Date.now()): string {
  return new Date(from + tierIntervalMs(tier)).toISOString();
}
