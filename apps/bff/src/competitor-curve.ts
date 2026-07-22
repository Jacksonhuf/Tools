export interface CompetitorCurvePoint {
  date: string;
  observation_count: number;
  min_effective_mxn: number;
  max_effective_mxn: number;
  avg_effective_mxn: number;
}

export function buildCompetitorCurve(
  observations: Array<{
    observed_at: string;
    effective_price: number;
  }>
): CompetitorCurvePoint[] {
  const buckets = new Map<string, number[]>();
  for (const o of observations) {
    const day = o.observed_at.slice(0, 10);
    const list = buckets.get(day) ?? [];
    list.push(o.effective_price);
    buckets.set(day, list);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, prices]) => {
      const sum = prices.reduce((a, b) => a + b, 0);
      return {
        date,
        observation_count: prices.length,
        min_effective_mxn: Math.min(...prices),
        max_effective_mxn: Math.max(...prices),
        avg_effective_mxn: Math.round((sum / prices.length) * 100) / 100,
      };
    });
}
