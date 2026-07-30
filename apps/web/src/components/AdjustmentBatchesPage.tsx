import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyAdjustmentPricesCsv,
  approveAdjustmentBatch,
  applyAdjustmentBatch,
  createAdjustmentBatch,
  fetchAdjustmentBatches,
  downloadAdjustmentBatchCsv,
  downloadAdjustmentBatchIndexCsv,
  downloadAdjustmentBatchesIndexCsv,
  downloadAdjustmentApprovalPolicyCsv,
  type AdjustmentBatch,
} from "../api/client";
import { useCanApprove, useCanPricingWrite } from "../auth/AuthContext";
import { AdjustmentBatchTable } from "./AdjustmentBatchTable";
import { toast } from "sonner";
import { statusBadgeVariant } from "@/components/layout/AppLayout";
import { PageIntent } from "@/components/patterns/PageIntent";
import { FormActions, FormField, FormInset, FormRow, FormSection } from "@/components/patterns/FormField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdjustmentBatchesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const canApprove = useCanApprove();
  const canWrite = useCanPricingWrite();
  const [batches, setBatches] = useState<AdjustmentBatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("manual");
  const [prices, setPrices] = useState({ ml: 1510, amz: 1510 });
  const [includeMl, setIncludeMl] = useState(true);
  const [includeAmz, setIncludeAmz] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importCsv, setImportCsv] = useState(
    "listing_id,explicit_price_mxn\nlisting-ml-001,1600\n"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat(
      locale === "es-MX" ? "es-MX" : locale === "zh-CN" ? "zh-CN" : "en-US",
      { style: "currency", currency: "MXN" }
    ).format(n);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAdjustmentBatches(locale);
      setBatches(data.items);
      setSelectedId((prev) => {
        if (prev && data.items.some((b) => b.id === prev)) return prev;
        return data.items[0]?.id ?? null;
      });
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = batches.find((b) => b.id === selectedId) ?? null;

  const createBatch = async () => {
    setError(null);
    setMessage(null);
    const items: Array<{ listing_id: string; explicit_price_mxn: number }> =
      [];
    if (includeMl) {
      items.push({
        listing_id: "listing-ml-001",
        explicit_price_mxn: prices.ml,
      });
    }
    if (includeAmz) {
      items.push({
        listing_id: "listing-amz-001",
        explicit_price_mxn: prices.amz,
      });
    }
    if (items.length === 0) {
      setError(t("selectListing"));
      return;
    }
    try {
      const batch = await createAdjustmentBatch(locale, {
        reason_code: reason,
        items,
      });
      setMessage(`${t("batchCreatedMsg")}: ${batch.id} (${batch.status})`);
      toast.success(`${t("batchCreatedMsg")}: ${batch.id}`);
      setSelectedId(batch.id);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const approve = async () => {
    if (!selected) return;
    try {
      await approveAdjustmentBatch(locale, selected.id);
      setMessage(t("batchApproved"));
      toast.success(t("batchApproved"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const apply = async () => {
    if (!selected) return;
    try {
      const result = await applyAdjustmentBatch(locale, selected.id);
      setMessage(
        `${t("batchApplied")}: ${result.version_ids?.join(", ") ?? ""}`
      );
      toast.success(t("batchApplied"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="space-y-4" data-testid="adjustment-batches-page">
      <PageIntent
        title={t("adjustmentsTitle")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              data-testid="adjustment-approval-policy-export"
              onClick={() =>
                void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
                  toast.success(t("adjustmentApprovalPolicyExportDone"))
                )
              }
            >
              {t("adjustmentApprovalPolicyExportCsv")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="adjustment-batches-index-export"
              onClick={() =>
                void downloadAdjustmentBatchesIndexCsv(locale).then(() =>
                  toast.success(t("adjustmentBatchesIndexExportDone"))
                )
              }
            >
              {t("adjustmentBatchesIndexExportCsv")}
            </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <FormSection title={t("createBatch")}>
          <FormField label={t("batchReason")} htmlFor="batch-reason" required>
            <Input
              id="batch-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <div className="space-y-3">
            <FormInset>
              <FormRow cols={1} className="items-center gap-3 !grid-cols-[auto_1fr_auto]">
                <Checkbox
                  id="include-ml"
                  checked={includeMl}
                  onCheckedChange={(v) => setIncludeMl(v === true)}
                />
                <Label htmlFor="include-ml" className="font-normal">
                  {t("mercadoLibre")}
                </Label>
                <Input
                  type="number"
                  className="w-28"
                  data-testid="adjustment-price-ml"
                  value={prices.ml}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, ml: Number(e.target.value) }))
                  }
                />
              </FormRow>
            </FormInset>
            <FormInset>
              <FormRow cols={1} className="items-center gap-3 !grid-cols-[auto_1fr_auto]">
                <Checkbox
                  id="include-amz"
                  checked={includeAmz}
                  onCheckedChange={(v) => setIncludeAmz(v === true)}
                />
                <Label htmlFor="include-amz" className="font-normal">
                  {t("amazonMx")}
                </Label>
                <Input
                  type="number"
                  className="w-28"
                  value={prices.amz}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, amz: Number(e.target.value) }))
                  }
                />
              </FormRow>
            </FormInset>
          </div>
          {canWrite && (
            <FormActions>
              <Button data-testid="adjustment-create-batch" onClick={() => void createBatch()}>
                {t("submitBatch")}
              </Button>
            </FormActions>
          )}
      </FormSection>

      <FormSection
        title={t("adjustmentCsvImport")}
        description={t("adjustmentCsvImportHint")}
        testId="adjustment-csv-import"
      >
          <FormField
            label={t("adjustmentCsvImport")}
            hint={t("adjustmentCsvImportHint")}
          >
            <Textarea
              rows={3}
              className="font-mono text-sm"
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
            />
          </FormField>
          {canWrite && (
            <FormActions>
              <Button
                data-testid="adjustment-csv-apply"
                onClick={() => {
                  setError(null);
                  void applyAdjustmentPricesCsv(locale, importCsv, reason)
                    .then((r) => {
                      toast.success(`${t("batchCreatedMsg")}: ${r.batch.id}`);
                      setSelectedId(r.batch.id);
                      return load();
                    })
                    .catch((e) => setError(String(e)));
                }}
              >
                {t("adjustmentCsvImportRun")}
              </Button>
            </FormActions>
          )}
      </FormSection>

      <FormSection title={t("batchList")}>
        <AdjustmentBatchTable
          batches={batches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          formatMoney={fmt}
        />
      </FormSection>

      {selected && (
        <FormSection title={t("batchDetail")}>
          <p className="text-sm">
            {t("batchStatus")}:{" "}
            <Badge
              variant={statusBadgeVariant(selected.status)}
              data-testid={`batch-status-${selected.status}`}
            >
              {selected.status}
            </Badge>
          </p>
          <ul className="space-y-1 text-sm">
            {selected.items.map((it) => (
              <li key={it.id} className="rounded-md bg-muted/40 px-3 py-2">
                {it.listing_id}: {fmt(it.from_price_mxn ?? 0)} →{" "}
                {fmt(it.explicit_price_mxn)}
              </li>
            ))}
          </ul>
          <FormActions className="border-t-0 pt-0">
            <Button
              variant="outline"
              size="sm"
              data-testid="adjustment-batch-export"
              onClick={() =>
                void downloadAdjustmentBatchCsv(locale, selected.id).then(() =>
                  toast.success(t("adjustmentBatchExportDone"))
                )
              }
            >
              {t("adjustmentBatchExportCsv")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="adjustment-batch-index-export"
              onClick={() =>
                void downloadAdjustmentBatchIndexCsv(locale, selected.id).then(
                  () => toast.success(t("adjustmentBatchIndexExportDone"))
                )
              }
            >
              {t("adjustmentBatchIndexExportCsv")}
            </Button>
            {selected.status === "pending_approval" && canApprove && (
              <Button data-testid="adjustment-approve" onClick={() => void approve()}>
                {t("approveBatch")}
              </Button>
            )}
            {(selected.status === "draft" || selected.status === "approved") &&
              canWrite && (
                <Button data-testid="adjustment-apply" onClick={() => void apply()}>
                  {t("applyBatch")}
                </Button>
              )}
          </FormActions>
        </FormSection>
      )}
    </div>
  );
}
