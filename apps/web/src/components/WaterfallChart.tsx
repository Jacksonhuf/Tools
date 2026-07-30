import type { WaterfallRow } from "../utils/waterfall";
import { layerLabel, maxWaterfallAmount } from "../utils/waterfall";

interface Props {
  rows: WaterfallRow[];
  formatAmount: (n: number) => string;
  layerLabels?: Record<string, string>;
}

export function WaterfallChart({ rows, formatAmount, layerLabels }: Props) {
  const max = maxWaterfallAmount(rows);
  return (
    <ul className="m-0 list-none p-0" data-testid="waterfall-chart">
      {rows.map((row) => (
        <li
          key={row.layer_id}
          className="mb-2 grid grid-cols-[110px_1fr_90px] items-center gap-2 text-sm"
        >
          <span className="layer-id">{layerLabel(row.layer_id, layerLabels)}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(row.amount_mxn / max) * 100}%` }}
            />
          </div>
          <span className="amount">{formatAmount(row.amount_mxn)}</span>
        </li>
      ))}
    </ul>
  );
}
