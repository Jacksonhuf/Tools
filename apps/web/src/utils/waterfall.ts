export interface WaterfallRow {
  layer_id: string;
  amount_mxn: number;
}

const LAYER_LABELS: Record<string, string> = {
  LANDED: "LANDED",
  TARGET_PROFIT: "TARGET_PROFIT",
  MATCH_PRICE: "MATCH_PRICE",
  FLOOR_BINDING: "FLOOR_BINDING",
  LIST_PRICE: "LIST_PRICE",
};

export function layerLabel(
  layerId: string,
  labels?: Record<string, string>
): string {
  return labels?.[layerId] ?? LAYER_LABELS[layerId] ?? layerId;
}

/** Largest amount first for visual cascade (P0-E6-05) */
export function sortWaterfallRows(rows: WaterfallRow[]): WaterfallRow[] {
  return [...rows].sort((a, b) => b.amount_mxn - a.amount_mxn);
}

export function maxWaterfallAmount(rows: WaterfallRow[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => r.amount_mxn), 1);
}
