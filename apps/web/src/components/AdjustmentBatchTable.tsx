import { useTranslation } from "react-i18next";
import type { AdjustmentBatch } from "../api/client";

const LISTING_LABELS: Record<string, string> = {
  "listing-ml-001": "Mercado Libre",
  "listing-amz-001": "Amazon MX",
};

interface Props {
  batches: AdjustmentBatch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  formatMoney: (n: number) => string;
}

export function AdjustmentBatchTable({
  batches,
  selectedId,
  onSelect,
  formatMoney,
}: Props) {
  const { t } = useTranslation();

  if (batches.length === 0) {
    return <p>{t("noBatches")}</p>;
  }

  return (
    <table className="batch-table" data-testid="adjustment-batch-table">
      <thead>
        <tr>
          <th>{t("batchId")}</th>
          <th>{t("batchStatus")}</th>
          <th>{t("batchReason")}</th>
          <th>{t("batchItems")}</th>
          <th>{t("batchCreated")}</th>
        </tr>
      </thead>
      <tbody>
        {batches.map((b) => (
          <tr
            key={b.id}
            className={selectedId === b.id ? "selected" : ""}
            onClick={() => onSelect(b.id)}
          >
            <td>{b.id}</td>
            <td>
              <span className={`status status-${b.status}`}>{b.status}</span>
            </td>
            <td>{b.reason_code ?? "—"}</td>
            <td>
              {b.items
                .map(
                  (it) =>
                    `${LISTING_LABELS[it.listing_id] ?? it.listing_id}: ${formatMoney(it.explicit_price_mxn)}`
                )
                .join("; ")}
            </td>
            <td>{new Date(b.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
