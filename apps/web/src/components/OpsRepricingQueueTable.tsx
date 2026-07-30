import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RepricingQueueItem } from "../api/client";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Surface } from "@/components/primitives/Surface";

export function OpsRepricingQueueTable({
  items,
  selected,
  onToggle,
  channelLabel,
  locale,
  toolbar,
}: {
  items: RepricingQueueItem[];
  selected: Set<string>;
  onToggle: (versionId: string) => void;
  channelLabel: (ch: string) => string;
  locale: string;
  toolbar?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () =>
      items.filter((row) =>
        matchDataTableFilter(
          filter,
          row.channel,
          row.state,
          row.publish_price_mxn,
          row.version_id
        )
      ),
    [items, filter]
  );

  return (
    <Surface variant="elevated" padding="none" className="mb-6 overflow-hidden">
      <div className="border-b border-border/50 px-5 py-4">
        <h2 className="text-base font-semibold">{t("opsQueue")}</h2>
      </div>
      <DataTable
        testId="repricing-queue-table"
        filter={filter}
        onFilterChange={setFilter}
        filterPlaceholder={t("dataTableFilterPlaceholder")}
        toolbar={toolbar}
        isEmpty={filtered.length === 0}
        emptyMessage={items.length === 0 ? t("opsQueueEmpty") : t("dataTableNoResults")}
        maxHeight={360}
        className="border-0 shadow-none ring-0"
      >
        <DataTableRoot>
          <DataTableHeader>
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead className="w-10">{t("opsSelect")}</DataTableHead>
              <DataTableHead>{t("channel")}</DataTableHead>
              <DataTableHead>{t("batchStatus")}</DataTableHead>
              <DataTableHead>{t("activePrice")} (MXN)</DataTableHead>
              <DataTableHead>{t("batchCreated")}</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {filtered.map((row) => (
              <DataTableRow key={row.version_id}>
                <DataTableCell>
                  <Checkbox
                    checked={selected.has(row.version_id)}
                    disabled={row.state !== "suggested"}
                    onCheckedChange={() => onToggle(row.version_id)}
                  />
                </DataTableCell>
                <DataTableCell>{channelLabel(row.channel)}</DataTableCell>
                <DataTableCell>
                  <StatusBadge status={row.state} />
                </DataTableCell>
                <DataTableCell className="font-mono tabular-nums">
                  {row.publish_price_mxn}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString(locale)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTableRoot>
      </DataTable>
    </Surface>
  );
}
