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
    <ul className="waterfall" data-testid="waterfall-chart">
      {rows.map((row) => (
        <li key={row.layer_id} className="waterfall-row">
          <span className="layer-id">{layerLabel(row.layer_id, layerLabels)}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(row.amount_mxn / max) * 100}%` }}
            />
          </div>
          <span className="amount">{formatAmount(row.amount_mxn)}</span>
        </li>
      ))}
    </ul>
  );
}
