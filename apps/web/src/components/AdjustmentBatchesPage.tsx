import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  approveAdjustmentBatch,
  applyAdjustmentBatch,
  createAdjustmentBatch,
  fetchAdjustmentBatches,
  type AdjustmentBatch,
} from "../api/client";
import { AdjustmentBatchTable } from "./AdjustmentBatchTable";

export function AdjustmentBatchesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [batches, setBatches] = useState<AdjustmentBatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("manual");
  const [prices, setPrices] = useState({ ml: 1510, amz: 1510 });
  const [includeMl, setIncludeMl] = useState(true);
  const [includeAmz, setIncludeAmz] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <h1>{t("adjustmentsTitle")}</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section className="card">
        <h2>{t("createBatch")}</h2>
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
        <button
          type="button"
          data-testid="adjustment-create-batch"
          onClick={() => void createBatch()}
        >
          {t("submitBatch")}
        </button>
      </section>

      <section className="card">
        <h2>{t("batchList")}</h2>
        <AdjustmentBatchTable
          batches={batches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          formatMoney={fmt}
        />
      </section>

      {selected && (
        <section className="card">
          <h2>{t("batchDetail")}</h2>
          <p>
            {t("batchStatus")}:{" "}
            <span className={`status status-${selected.status}`}>
              {selected.status}
            </span>
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
            {selected.status === "pending_approval" && (
              <button
                type="button"
                className="primary"
                data-testid="adjustment-approve"
                onClick={() => void approve()}
              >
                {t("approveBatch")}
              </button>
            )}
            {(selected.status === "draft" ||
              selected.status === "approved") && (
              <button
                type="button"
                className="primary"
                data-testid="adjustment-apply"
                onClick={() => void apply()}
              >
                {t("applyBatch")}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
