import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  applyLandedFromCostSheet,
  applyLandedFromFx,
  createCostSheetRow,
  downloadCostSheetCsv,
  downloadCostSheetsCsv,
  downloadCostSheetsTemplate,
  fetchCostSheets,
  fetchSkus,
  patchSkuLandedCost,
  type CostSheetRow,
} from "../api/client";
import { useCanPricingWrite } from "../auth/AuthContext";
import { PageIntent } from "@/components/patterns/PageIntent";
import { KpiStrip } from "@/components/patterns/KpiStrip";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
} from "@/components/patterns/DataTable";
import { FormActions, FormField, FormRow, FormSection } from "@/components/patterns/FormField";
import { KpiMetric } from "@/components/primitives/KpiMetric";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SkuCostPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const canWrite = useCanPricingWrite();
  const [skus, setSkus] = useState<
    Array<{ id: string; sku_code: string; name: string; landed_cost_mxn: number }>
  >([]);
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");
  const [landedEdit, setLandedEdit] = useState(0);
  const [costSheets, setCostSheets] = useState<CostSheetRow[]>([]);
  const [batchNo, setBatchNo] = useState("BATCH-001");
  const [cogsAmount, setCogsAmount] = useState(100);
  const [cogsCurrency, setCogsCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);

  const selectedSku = skus.find((s) => s.id === selectedSkuId) ?? null;

  const loadSkus = useCallback(async () => {
    const data = await fetchSkus(locale);
    setSkus(data.items);
    setSelectedSkuId((prev) => {
      if (prev && data.items.some((s) => s.id === prev)) return prev;
      return data.items[0]?.id ?? "";
    });
  }, [locale]);

  const loadCostSheets = useCallback(async () => {
    if (!selectedSkuId) {
      setCostSheets([]);
      return;
    }
    const data = await fetchCostSheets(locale, selectedSkuId);
    setCostSheets(data.items);
  }, [locale, selectedSkuId]);

  useEffect(() => {
    void loadSkus().catch((e) => setError(String(e)));
  }, [loadSkus]);

  useEffect(() => {
    if (!selectedSku) return;
    setLandedEdit(selectedSku.landed_cost_mxn);
    void loadCostSheets().catch((e) => setError(String(e)));
  }, [selectedSku, loadCostSheets]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(
      locale === "es-MX" ? "es-MX" : locale === "zh-CN" ? "zh-CN" : "en-US",
      { style: "currency", currency: "MXN" }
    ).format(n);

  const saveLanded = async () => {
    if (!selectedSkuId || !canWrite) return;
    setError(null);
    try {
      await patchSkuLandedCost(locale, selectedSkuId, landedEdit);
      await loadSkus();
      toast.success(t("landedSaved"));
    } catch (e) {
      setError(String(e));
    }
  };

  const addCostSheet = async () => {
    if (!selectedSkuId || !canWrite) return;
    setError(null);
    try {
      await createCostSheetRow(locale, selectedSkuId, {
        batch_no: batchNo,
        cogs_amount: cogsAmount,
        cogs_currency: cogsCurrency,
      });
      await loadCostSheets();
      toast.success(t("costSheetCreated"));
    } catch (e) {
      setError(String(e));
    }
  };

  const applySheetLanded = async () => {
    const latest = costSheets[0];
    if (!latest || !selectedSkuId || !canWrite) return;
    setError(null);
    try {
      const r = await applyLandedFromCostSheet(locale, selectedSkuId, latest.id);
      setLandedEdit(r.sku.landed_cost_mxn);
      await loadSkus();
      toast.success(t("costSheetLandedApplied", { landed: r.sku.landed_cost_mxn }));
    } catch (e) {
      setError(String(e));
    }
  };

  const applyFxLanded = async () => {
    if (!selectedSkuId || !canWrite) return;
    setError(null);
    try {
      const r = await applyLandedFromFx(locale, selectedSkuId, {
        cogs_amount: cogsAmount,
        cogs_currency: cogsCurrency,
        apply: true,
      });
      setLandedEdit(r.sku.landed_cost_mxn);
      await loadSkus();
      toast.success(t("skuCostFxApplied", { landed: r.sku.landed_cost_mxn }));
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4" data-testid="sku-cost-page">
        <PageIntent title={t("skuCostTitle")} description={t("skuCostHint")} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormSection title={t("sku")}>
          <FormField label={t("sku")} htmlFor="sku-select">
            <Select value={selectedSkuId} onValueChange={setSelectedSkuId}>
              <SelectTrigger id="sku-select" data-testid="sku-cost-selector">
                <SelectValue placeholder={t("sku")} />
              </SelectTrigger>
              <SelectContent>
                {skus.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sku_code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {selectedSku && (
            <KpiStrip className="mb-0">
              <KpiMetric
                label={t("landedCost")}
                value={
                  <span data-testid="sku-cost-landed-display">
                    {fmt(selectedSku.landed_cost_mxn)}
                  </span>
                }
              />
            </KpiStrip>
          )}
        </FormSection>

        <FormSection title={t("landedCost")} testId="sku-cost-landed-panel">
            <FormField
              label={`${t("landedCost")} (MXN)`}
              htmlFor="landed-input"
              hint={!canWrite ? t("skuCostReadOnly") : undefined}
            >
              <Input
                id="landed-input"
                type="number"
                data-testid="sku-cost-landed-input"
                value={landedEdit}
                disabled={!canWrite}
                onChange={(e) => setLandedEdit(Number(e.target.value))}
              />
            </FormField>
            {canWrite && (
              <FormActions>
                <Button
                  data-testid="sku-cost-landed-save"
                  onClick={() => void saveLanded()}
                >
                  {t("saveLanded")}
                </Button>
              </FormActions>
            )}
        </FormSection>

        <FormSection
          title={t("costSheetsTitle")}
          description={t("costSheetBatch")}
          testId="sku-cost-sheets-panel"
        >
            <div className="flex justify-end -mt-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="sku-cost-template-download"
              onClick={() =>
                void downloadCostSheetsTemplate(locale).then(() =>
                  toast.success(t("skuCostTemplateDone"))
                )
              }
            >
              {t("skuCostTemplateDownload")}
            </Button>
            </div>
            {canWrite && (
              <>
                <FormRow cols={3}>
                  <FormField label={t("costSheetBatch")}>
                    <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
                  </FormField>
                  <FormField label="COGS">
                    <Input
                      type="number"
                      value={cogsAmount}
                      onChange={(e) => setCogsAmount(Number(e.target.value))}
                    />
                  </FormField>
                  <FormField label={t("skuCostCurrency")}>
                    <Select value={cogsCurrency} onValueChange={setCogsCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="MXN">MXN</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </FormRow>
                <FormActions>
                  <Button data-testid="sku-cost-sheet-add" onClick={() => void addCostSheet()}>
                    {t("costSheetAdd")}
                  </Button>
                  <Button
                    variant="secondary"
                    data-testid="sku-cost-sheet-apply-landed"
                    onClick={() => void applySheetLanded()}
                  >
                    {t("costSheetApplyLanded")}
                  </Button>
                  <Button
                    variant="secondary"
                    data-testid="sku-cost-fx-apply"
                    onClick={() => void applyFxLanded()}
                  >
                    {t("skuCostFxApply")}
                  </Button>
                </FormActions>
              </>
            )}
            <FormActions className="border-t-0 pt-0">
            <Button
              variant="outline"
              data-testid="sku-cost-sheets-export"
              disabled={!selectedSkuId}
              onClick={() =>
                selectedSkuId &&
                void downloadCostSheetsCsv(locale, selectedSkuId).then(() =>
                  toast.success(t("costSheetExportDone"))
                )
              }
            >
              {t("costSheetExportCsv")}
            </Button>
            </FormActions>
            <DataTable
              testId="sku-cost-sheets-table"
              isEmpty={costSheets.length === 0}
              emptyMessage={t("dataTableNoResults")}
              maxHeight={280}
            >
              <DataTableRoot>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>{t("costSheetBatch")}</DataTableHead>
                    <DataTableHead>COGS</DataTableHead>
                    <DataTableHead className="w-[80px]" />
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {costSheets.slice(0, 5).map((s) => (
                    <DataTableRow key={s.id}>
                      <DataTableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {s.batch_no}
                        </code>
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {s.cogs_amount} {s.cogs_currency}
                      </DataTableCell>
                      <DataTableCell>
                        {canWrite && selectedSkuId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`sku-cost-sheet-export-${s.id}`}
                                onClick={() =>
                                  void downloadCostSheetCsv(locale, selectedSkuId, s.id).then(
                                    () => toast.success(t("costSheetRowExportDone"))
                                  )
                                }
                              >
                                CSV
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("costSheetRowExportCsv")}</TooltipContent>
                          </Tooltip>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTableRoot>
            </DataTable>
        </FormSection>
      </div>
    </TooltipProvider>
  );
}
