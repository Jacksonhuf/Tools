import type { CompetitorCurvePoint } from "./competitor-curve.js";

export function competitorCurvePointsToCsv(points: CompetitorCurvePoint[]): string {
  const lines = [
    "date,observation_count,min_effective_mxn,max_effective_mxn,avg_effective_mxn",
  ];
  for (const p of points) {
    lines.push(
      [
        p.date,
        String(p.observation_count),
        String(p.min_effective_mxn),
        String(p.max_effective_mxn),
        String(p.avg_effective_mxn),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
