let simulateCount = 0;
let simulateTotalMs = 0;
let simulateDurationsMs: number[] = [];
let lastRepricingProcessedAt: string | null = null;

const MAX_DURATION_SAMPLES = 500;

export function recordPricingSimulate(durationMs: number) {
  simulateCount += 1;
  simulateTotalMs += durationMs;
  simulateDurationsMs.push(durationMs);
  if (simulateDurationsMs.length > MAX_DURATION_SAMPLES) {
    simulateDurationsMs = simulateDurationsMs.slice(-MAX_DURATION_SAMPLES);
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1
  );
  return Math.round(sorted[idx] ?? 0);
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
    pricing_calc_duration_ms_p95: percentile(simulateDurationsMs, 95),
    repricing_last_processed_at: lastRepricingProcessedAt,
    repricing_lag_seconds: lastRepricingProcessedAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(lastRepricingProcessedAt).getTime()) / 1000
          )
        )
      : null,
    k6_baseline: {
      pricing_context_p95_ms_threshold: 3000,
      pricing_simulate_p95_ms_threshold: 3000,
    },
  };
}

export function resetPricingNfrMetricsForTests() {
  simulateCount = 0;
  simulateTotalMs = 0;
  simulateDurationsMs = [];
  lastRepricingProcessedAt = null;
}
