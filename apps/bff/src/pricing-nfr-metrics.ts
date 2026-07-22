let simulateCount = 0;
let simulateTotalMs = 0;
let lastRepricingProcessedAt: string | null = null;

export function recordPricingSimulate(durationMs: number) {
  simulateCount += 1;
  simulateTotalMs += durationMs;
}

export function recordRepricingProcessed() {
  lastRepricingProcessedAt = new Date().toISOString();
}

export function getPricingNfrMetrics() {
  const avgMs =
    simulateCount > 0 ? Math.round(simulateTotalMs / simulateCount) : 0;
  return {
    pricing_simulate_count: simulateCount,
    pricing_calc_duration_ms_avg: avgMs,
    repricing_last_processed_at: lastRepricingProcessedAt,
    repricing_lag_seconds: lastRepricingProcessedAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(lastRepricingProcessedAt).getTime()) / 1000
          )
        )
      : null,
  };
}

export function resetPricingNfrMetricsForTests() {
  simulateCount = 0;
  simulateTotalMs = 0;
  lastRepricingProcessedAt = null;
}
