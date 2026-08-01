import {
  buildWaterfallBarSegments,
  legacyRowsToSteps,
  type WaterfallStep,
} from "../utils/waterfall";

interface Props {
  steps?: WaterfallStep[];
  /** Legacy rows when waterfall_steps is absent */
  fallbackRows?: Array<{ layer_id: string; amount_mxn: number }>;
  publishPriceMxn: number;
  formatAmount: (n: number) => string;
  layerLabels?: Record<string, string>;
  title?: string;
}

const CHART_HEIGHT = 260;
const LABEL_WIDTH = 108;
const AMOUNT_WIDTH = 88;
const BAR_AREA_WIDTH = 320;

const BAR_COLORS: Record<string, string> = {
  LIST_PRICE: "hsl(var(--primary))",
  LANDED: "hsl(142 76% 36%)",
  IVA_DISPLAY: "hsl(38 92% 50%)",
  PLATFORM_COMMISSION: "hsl(217 91% 60%)",
  PAYMENT_FEE: "hsl(199 89% 48%)",
  FULFILLMENT: "hsl(262 83% 58%)",
  MERCHANT_MARGIN: "hsl(160 84% 39%)",
};

function barColor(layerId: string, isDecrease: boolean): string {
  if (isDecrease) {
    return BAR_COLORS[layerId] ?? "hsl(var(--muted-foreground))";
  }
  return BAR_COLORS[layerId] ?? "hsl(var(--primary))";
}

export function WaterfallLadderChart({
  steps,
  fallbackRows,
  publishPriceMxn,
  formatAmount,
  layerLabels,
  title,
}: Props) {
  const resolvedSteps =
    steps && steps.length > 0
      ? steps
      : fallbackRows
        ? legacyRowsToSteps(fallbackRows, publishPriceMxn)
        : [];

  const segments = buildWaterfallBarSegments(
    resolvedSteps,
    formatAmount,
    layerLabels
  );

  if (segments.length === 0) return null;

  const totalWidth = LABEL_WIDTH + BAR_AREA_WIDTH + AMOUNT_WIDTH;

  return (
    <figure className="space-y-2" data-testid="waterfall-ladder-chart">
      {title && (
        <figcaption className="text-sm font-medium text-muted-foreground">
          {title}
        </figcaption>
      )}
      <svg
        viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={title ?? "Price waterfall ladder"}
      >
        {segments.map((seg, index) => {
          const barTop = seg.yTop * CHART_HEIGHT;
          const barBottom = seg.yBottom * CHART_HEIGHT;
          const barHeight = Math.max(barBottom - barTop, 2);
          const barX = LABEL_WIDTH + seg.xOffset * BAR_AREA_WIDTH;
          const barWidth =
            BAR_AREA_WIDTH * (seg.kind === "decrease" ? 0.62 : 0.88) -
            seg.xOffset * BAR_AREA_WIDTH;
          const midY = barTop + barHeight / 2;

          return (
            <g key={`${seg.layer_id}-${index}`} data-layer={seg.layer_id}>
              <text
                x={0}
                y={midY}
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {seg.label}
              </text>
              {index > 0 && seg.kind === "decrease" && (
                <line
                  x1={barX - 6}
                  y1={barTop}
                  x2={barX}
                  y2={barTop}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
              )}
              <rect
                x={barX}
                y={barTop}
                width={Math.max(barWidth, 24)}
                height={barHeight}
                rx={3}
                fill={barColor(seg.layer_id, seg.isDecrease)}
                opacity={seg.isDecrease ? 0.88 : 1}
              />
              <text
                x={LABEL_WIDTH + BAR_AREA_WIDTH + 8}
                y={midY}
                dominantBaseline="middle"
                className={`text-[11px] tabular-nums ${
                  seg.isDecrease
                    ? "fill-amber-700 dark:fill-amber-400"
                    : "fill-foreground"
                }`}
              >
                {seg.formattedAmount}
              </text>
            </g>
          );
        })}
        <line
          x1={LABEL_WIDTH}
          y1={CHART_HEIGHT - 1}
          x2={LABEL_WIDTH + BAR_AREA_WIDTH}
          y2={CHART_HEIGHT - 1}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
      </svg>
    </figure>
  );
}
