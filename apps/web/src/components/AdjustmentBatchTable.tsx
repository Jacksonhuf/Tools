import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdjustmentBatch } from "../api/client";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
  matchDataTableFilter,
} from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/primitives/StatusBadge";

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
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () =>
      batches.filter((b) =>
        matchDataTableFilter(
          filter,
          b.id,
          b.status,
          b.reason_code,
          b.items.map((it) => it.listing_id).join(" ")
        )
      ),
    [batches, filter]
  );

  return (
    <DataTable
      testId="adjustment-batch-table"
      filter={filter}
      onFilterChange={setFilter}
      filterPlaceholder={t("dataTableFilterPlaceholder")}
      isEmpty={filtered.length === 0}
      emptyMessage={batches.length === 0 ? t("noBatches") : t("dataTableNoResults")}
      maxHeight={420}
    >
      <DataTableRoot>
        <DataTableHeader>
          <DataTableRow className="hover:bg-transparent">
            <DataTableHead>{t("batchId")}</DataTableHead>
            <DataTableHead>{t("batchStatus")}</DataTableHead>
            <DataTableHead>{t("batchReason")}</DataTableHead>
            <DataTableHead>{t("batchItems")}</DataTableHead>
            <DataTableHead>{t("batchCreated")}</DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filtered.map((b) => (
            <DataTableRow
              key={b.id}
              selected={selectedId === b.id}
              onClick={() => onSelect(b.id)}
            >
              <DataTableCell className="font-mono text-xs">{b.id}</DataTableCell>
              <DataTableCell>
                <StatusBadge
                  status={b.status}
                  data-testid={`batch-status-${b.status}`}
                />
              </DataTableCell>
              <DataTableCell>{b.reason_code ?? "—"}</DataTableCell>
              <DataTableCell className="max-w-md truncate">
                {b.items
                  .map(
                    (it) =>
                      `${LISTING_LABELS[it.listing_id] ?? it.listing_id}: ${formatMoney(it.explicit_price_mxn)}`
                  )
                  .join("; ")}
              </DataTableCell>
              <DataTableCell className="text-muted-foreground">
                {new Date(b.created_at).toLocaleString()}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTableRoot>
    </DataTable>
  );
}
