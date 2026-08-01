export interface WaterfallRow {
  layer_id: string;
  amount_mxn: number;
}

export type WaterfallStepKind = "total" | "decrease" | "subtotal";

export interface WaterfallStep {
  layer_id: string;
  kind: WaterfallStepKind;
  amount_mxn: number;
  running_total_mxn: number;
}

const LAYER_LABELS: Record<string, string> = {
  LANDED: "LANDED",
  TARGET_PROFIT: "TARGET_PROFIT",
  MATCH_PRICE: "MATCH_PRICE",
  FLOOR_BINDING: "FLOOR_BINDING",
  LIST_PRICE: "LIST_PRICE",
  IVA_DISPLAY: "IVA_DISPLAY",
  PLATFORM_COMMISSION: "PLATFORM_COMMISSION",
  PAYMENT_FEE: "PAYMENT_FEE",
  FULFILLMENT: "FULFILLMENT",
  MERCHANT_MARGIN: "MERCHANT_MARGIN",
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

export interface WaterfallBarSegment {
  layer_id: string;
  kind: WaterfallStepKind;
  label: string;
  amount_mxn: number;
  /** 0–1 scale along price axis */
  yTop: number;
  yBottom: number;
  /** Horizontal offset for ladder effect (0–1) */
  xOffset: number;
  formattedAmount: string;
  isDecrease: boolean;
}

/** Map API waterfall steps to SVG bar geometry (retail at top → landed at bottom). */
export function buildWaterfallBarSegments(
  steps: WaterfallStep[],
  formatAmount: (n: number) => string,
  layerLabels?: Record<string, string>
): WaterfallBarSegment[] {
  if (steps.length === 0) return [];

  const maxPrice = Math.max(
    ...steps.map((s) =>
      s.kind === "decrease" ? s.running_total_mxn + s.amount_mxn : s.amount_mxn
    ),
    1
  );
  const scale = (price: number) => 1 - price / maxPrice;

  let ladder = 0;
  const segments: WaterfallBarSegment[] = [];

  for (const step of steps) {
    const label = layerLabel(step.layer_id, layerLabels);
    const xOffset = step.kind === "decrease" ? 0.08 + ladder * 0.04 : 0;

    if (step.kind === "total") {
      segments.push({
        layer_id: step.layer_id,
        kind: step.kind,
        label,
        amount_mxn: step.amount_mxn,
        yTop: scale(step.amount_mxn),
        yBottom: scale(0),
        xOffset: 0,
        formattedAmount: formatAmount(step.amount_mxn),
        isDecrease: false,
      });
      continue;
    }

    if (step.kind === "decrease") {
      const top = step.running_total_mxn + step.amount_mxn;
      segments.push({
        layer_id: step.layer_id,
        kind: step.kind,
        label,
        amount_mxn: step.amount_mxn,
        yTop: scale(top),
        yBottom: scale(step.running_total_mxn),
        xOffset,
        formattedAmount: `−${formatAmount(step.amount_mxn)}`,
        isDecrease: true,
      });
      ladder += 1;
      continue;
    }

    segments.push({
      layer_id: step.layer_id,
      kind: step.kind,
      label,
      amount_mxn: step.amount_mxn,
      yTop: scale(step.amount_mxn),
      yBottom: scale(0),
      xOffset: 0,
      formattedAmount: formatAmount(step.amount_mxn),
      isDecrease: false,
    });
  }

  return segments;
}

/** Fallback when API only returns legacy waterfall rows. */
export function legacyRowsToSteps(
  rows: WaterfallRow[],
  publishPrice: number
): WaterfallStep[] {
  const landed = rows.find((r) => r.layer_id === "LANDED");
  if (!landed) return [];

  const steps: WaterfallStep[] = [
    {
      layer_id: "LIST_PRICE",
      kind: "total",
      amount_mxn: publishPrice,
      running_total_mxn: publishPrice,
    },
  ];

  let running = publishPrice;
  for (const row of rows) {
    if (row.layer_id === "LANDED" || row.layer_id === "LIST_PRICE") continue;
    const amount = Math.max(0, running - row.amount_mxn);
    if (amount <= 0) continue;
    running = row.amount_mxn;
    steps.push({
      layer_id: row.layer_id,
      kind: "decrease",
      amount_mxn: amount,
      running_total_mxn: running,
    });
  }

  steps.push({
    layer_id: "LANDED",
    kind: "subtotal",
    amount_mxn: landed.amount_mxn,
    running_total_mxn: landed.amount_mxn,
  });

  return steps;
}
