import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const [message, setMessage] = useState<string | null>(null);
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
      setMessage(t("landedSaved"));
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
      setMessage(t("costSheetCreated"));
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
      setMessage(t("costSheetLandedApplied", { landed: r.sku.landed_cost_mxn }));
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
      setMessage(t("skuCostFxApplied", { landed: r.sku.landed_cost_mxn }));
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="page page-wide" data-testid="sku-cost-page">
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section className="card">
        <h2>{t("skuCostTitle")}</h2>
        <p className="hint">{t("skuCostHint")}</p>
        <label>
          {t("sku")}
          <select
            data-testid="sku-cost-selector"
            value={selectedSkuId}
            onChange={(e) => setSelectedSkuId(e.target.value)}
          >
            {skus.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sku_code} — {s.name}
              </option>
            ))}
          </select>
        </label>
        {selectedSku && (
          <p data-testid="sku-cost-landed-display">
            {t("landedCost")}: {fmt(selectedSku.landed_cost_mxn)}
          </p>
        )}
      </section>

      <section className="card" data-testid="sku-cost-landed-panel">
        <h3>{t("landedCost")}</h3>
        <label>
          {t("landedCost")} (MXN)
          <input
            type="number"
            data-testid="sku-cost-landed-input"
            value={landedEdit}
            disabled={!canWrite}
            onChange={(e) => setLandedEdit(Number(e.target.value))}
          />
        </label>
        {canWrite ? (
          <button
            type="button"
            data-testid="sku-cost-landed-save"
            onClick={() => void saveLanded()}
          >
            {t("saveLanded")}
          </button>
        ) : (
          <p className="hint">{t("skuCostReadOnly")}</p>
        )}
      </section>

      <section className="card" data-testid="sku-cost-sheets-panel">
        <h3>{t("costSheetsTitle")}</h3>
        <button
          type="button"
          data-testid="sku-cost-template-download"
          onClick={() =>
            void downloadCostSheetsTemplate(locale).then(() =>
              setMessage(t("skuCostTemplateDone"))
            )
          }
        >
          {t("skuCostTemplateDownload")}
        </button>
        {canWrite && (
          <>
            <label>
              {t("costSheetBatch")}
              <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            </label>
            <label>
              COGS
              <input
                type="number"
                value={cogsAmount}
                onChange={(e) => setCogsAmount(Number(e.target.value))}
              />
            </label>
            <label>
              {t("skuCostCurrency")}
              <select
                value={cogsCurrency}
                onChange={(e) => setCogsCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
              </select>
            </label>
            <button
              type="button"
              data-testid="sku-cost-sheet-add"
              onClick={() => void addCostSheet()}
            >
              {t("costSheetAdd")}
            </button>
            <button
              type="button"
              data-testid="sku-cost-sheet-apply-landed"
              onClick={() => void applySheetLanded()}
            >
              {t("costSheetApplyLanded")}
            </button>
            <button
              type="button"
              data-testid="sku-cost-fx-apply"
              onClick={() => void applyFxLanded()}
            >
              {t("skuCostFxApply")}
            </button>
          </>
        )}
        <button
          type="button"
          data-testid="sku-cost-sheets-export"
          disabled={!selectedSkuId}
          onClick={() =>
            selectedSkuId &&
            void downloadCostSheetsCsv(locale, selectedSkuId).then(() =>
              setMessage(t("costSheetExportDone"))
            )
          }
        >
          {t("costSheetExportCsv")}
        </button>
        <ul>
          {costSheets.slice(0, 5).map((s) => (
            <li key={s.id}>
              <code>{s.batch_no}</code>: {s.cogs_amount} {s.cogs_currency}
              {canWrite && selectedSkuId && (
                <button
                  type="button"
                  data-testid={`sku-cost-sheet-export-${s.id}`}
                  onClick={() =>
                    void downloadCostSheetCsv(locale, selectedSkuId, s.id).then(
                      () => setMessage(t("costSheetRowExportDone"))
                    )
                  }
                >
                  CSV
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
