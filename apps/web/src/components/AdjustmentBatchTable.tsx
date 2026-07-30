import { useTranslation } from "react-i18next";
import type { AdjustmentBatch } from "../api/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusBadgeVariant } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

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
    return <p className="text-sm text-muted-foreground">{t("noBatches")}</p>;
  }

  return (
    <Table data-testid="adjustment-batch-table">
      <TableHeader>
        <TableRow>
          <TableHead>{t("batchId")}</TableHead>
          <TableHead>{t("batchStatus")}</TableHead>
          <TableHead>{t("batchReason")}</TableHead>
          <TableHead>{t("batchItems")}</TableHead>
          <TableHead>{t("batchCreated")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((b) => (
          <TableRow
            key={b.id}
            className={cn(
              "cursor-pointer",
              selectedId === b.id && "bg-primary/10"
            )}
            onClick={() => onSelect(b.id)}
          >
            <TableCell className="font-mono text-xs">{b.id}</TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(b.status)}>{b.status}</Badge>
            </TableCell>
            <TableCell>{b.reason_code ?? "—"}</TableCell>
            <TableCell className="max-w-md truncate">
              {b.items
                .map(
                  (it) =>
                    `${LISTING_LABELS[it.listing_id] ?? it.listing_id}: ${formatMoney(it.explicit_price_mxn)}`
                )
                .join("; ")}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(b.created_at).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
