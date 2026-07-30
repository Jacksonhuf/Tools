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
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from "../ui";

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
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="page page-wide" data-testid="adjustment-batches-page">
      <PageHeader title={t("adjustmentsTitle")} />
      <div className="button-row">
        <button
          type="button"
          data-testid="adjustment-approval-policy-export"
          onClick={() =>
            void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
              setMessage(t("adjustmentApprovalPolicyExportDone"))
            )
          }
        >
          {t("adjustmentApprovalPolicyExportCsv")}
        </button>
        <button
          type="button"
          data-testid="adjustment-batches-index-export"
          onClick={() =>
            void downloadAdjustmentBatchesIndexCsv(locale).then(() =>
              setMessage(t("adjustmentBatchesIndexExportDone"))
            )
          }
        >
          {t("adjustmentBatchesIndexExportCsv")}
        </button>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Card>
        <CardHeader title={t("createBatch")} />
        <label>
          {t("batchReason")}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="listing-checks">
          <label>
            <input
              type="checkbox"
              checked={includeMl}
              onChange={(e) => setIncludeMl(e.target.checked)}
            />
            {t("mercadoLibre")}
            <input
              type="number"
              data-testid="adjustment-price-ml"
              value={prices.ml}
              onChange={(e) =>
                setPrices((p) => ({ ...p, ml: Number(e.target.value) }))
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeAmz}
              onChange={(e) => setIncludeAmz(e.target.checked)}
            />
            {t("amazonMx")}
            <input
              type="number"
              value={prices.amz}
              onChange={(e) =>
                setPrices((p) => ({ ...p, amz: Number(e.target.value) }))
              }
            />
          </label>
        </div>
        {canWrite && (
          <Button
            variant="primary"
            data-testid="adjustment-create-batch"
            onClick={() => void createBatch()}
          >
            {t("submitBatch")}
          </Button>
        )}
      </Card>

      <Card data-testid="adjustment-csv-import">
        <CardHeader title={t("adjustmentCsvImport")} description={t("adjustmentCsvImportHint")} />
        <textarea
          rows={3}
          value={importCsv}
          onChange={(e) => setImportCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        {canWrite && (
          <Button
            variant="primary"
            data-testid="adjustment-csv-apply"
            onClick={() => {
              setError(null);
              void applyAdjustmentPricesCsv(locale, importCsv, reason)
                .then((r) => {
                  setMessage(
                    `${t("batchCreatedMsg")}: ${r.batch.id} (${r.batch.status})`
                  );
                  setSelectedId(r.batch.id);
                  return load();
                })
                .catch((e) => setError(String(e)));
            }}
          >
            {t("adjustmentCsvImportRun")}
          </Button>
        )}
      </Card>

      <Card>
        <CardHeader title={t("batchList")} />
        <AdjustmentBatchTable
          batches={batches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          formatMoney={fmt}
        />
      </Card>

      {selected && (
        <Card>
          <CardHeader title={t("batchDetail")} />
          <p>
            {t("batchStatus")}: <Badge status={selected.status}>{selected.status}</Badge>
          </p>
          <ul>
            {selected.items.map((it) => (
              <li key={it.id}>
                {it.listing_id}: {fmt(it.from_price_mxn ?? 0)} →{" "}
                {fmt(it.explicit_price_mxn)}
              </li>
            ))}
          </ul>
          <div className="batch-actions">
            <button
              type="button"
              data-testid="adjustment-batch-export"
              onClick={() =>
                void downloadAdjustmentBatchCsv(locale, selected.id).then(() =>
                  setMessage(t("adjustmentBatchExportDone"))
                )
              }
            >
              {t("adjustmentBatchExportCsv")}
            </button>
            <button
              type="button"
              data-testid="adjustment-batch-index-export"
              onClick={() =>
                void downloadAdjustmentBatchIndexCsv(locale, selected.id).then(
                  () => setMessage(t("adjustmentBatchIndexExportDone"))
                )
              }
            >
              {t("adjustmentBatchIndexExportCsv")}
            </button>
            {selected.status === "pending_approval" && canApprove && (
              <Button
                variant="primary"
                data-testid="adjustment-approve"
                onClick={() => void approve()}
              >
                {t("approveBatch")}
              </Button>
            )}
            {(selected.status === "draft" ||
              selected.status === "approved") &&
              canWrite && (
              <Button
                variant="primary"
                data-testid="adjustment-apply"
                onClick={() => void apply()}
              >
                {t("applyBatch")}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
