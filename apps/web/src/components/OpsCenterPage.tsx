import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  batchChannelPublish,
  DEMO_SKU,
  fetchRepricingQueue,
  promoteRepricingToPending,
  type RepricingQueueItem,
} from "../api/client";

const DEMO_LISTINGS = ["listing-ml-001", "listing-amz-001"];

export function OpsCenterPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [items, setItems] = useState<RepricingQueueItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRepricingQueue(locale, DEMO_SKU);
      setItems(data.items);
      setSelected(
        new Set(
          data.items.filter((i) => i.state === "suggested").map((i) => i.version_id)
        )
      );
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (versionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) next.delete(versionId);
      else next.add(versionId);
      return next;
    });
  };

  const promote = async () => {
    setError(null);
    setMessage(null);
    const ids = [...selected].filter((id) =>
      items.some((i) => i.version_id === id && i.state === "suggested")
    );
    if (ids.length === 0) {
      setError(t("opsSelectSuggested"));
      return;
    }
    try {
      const result = await promoteRepricingToPending(locale, ids);
      setMessage(
        t("opsPromoted", { count: result.updated.length, skipped: result.skipped.length })
      );
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const publishBatch = async () => {
    setError(null);
    setMessage(null);
    try {
      const { ok, json } = await batchChannelPublish(locale, DEMO_LISTINGS);
      if (json.publish_status === "all_published") {
        setMessage(t("opsBatchAllPublished"));
      } else if (json.publish_status === "partial_success") {
        setMessage(t("opsBatchPartial"));
      } else {
        setError(t("opsBatchFailed"));
      }
      if (!ok && json.publish_status !== "partial_success") {
        return;
      }
      void load();
    } catch (e) {
      setError(String(e));
    }
  };

  const channelLabel = (ch: string) =>
    ch === "MERCADO_LIBRE" ? t("mercadoLibre") : t("amazonMx");

  return (
    <div className="page page-wide">
      <h1>{t("opsTitle")}</h1>
      <p className="hint">{t("opsHint")}</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section className="card controls">
        <button type="button" onClick={() => void promote()}>
          {t("opsPromotePending")}
        </button>
        <button type="button" onClick={() => void publishBatch()}>
          {t("opsBatchPublish")}
        </button>
      </section>

      <section className="card">
        <h2>{t("opsQueue")}</h2>
        <table className="batch-table" data-testid="repricing-queue-table">
          <thead>
            <tr>
              <th>{t("opsSelect")}</th>
              <th>{t("channel")}</th>
              <th>{t("batchStatus")}</th>
              <th>{t("activePrice")} (MXN)</th>
              <th>{t("batchCreated")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>{t("opsQueueEmpty")}</td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.version_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(row.version_id)}
                      disabled={row.state !== "suggested"}
                      onChange={() => toggle(row.version_id)}
                    />
                  </td>
                  <td>{channelLabel(row.channel)}</td>
                  <td>
                    <span className={`status status-${row.state}`}>
                      {row.state}
                    </span>
                  </td>
                  <td>{row.publish_price_mxn}</td>
                  <td>{new Date(row.created_at).toLocaleString(locale)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
