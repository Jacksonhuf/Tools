import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  batchChannelPublish,
  DEMO_SKU,
  downloadPricingSnapshotCsv,
  downloadVersionBackup,
  fetchOpsMetrics,
  fetchWorkerStatus,
  importCostSheetsCsv,
  importLandedCostCsv,
  fetchReconciliationAlerts,
  fetchRepricingQueue,
  fetchTariffHsRates,
  previewAdjustmentPricesCsv,
  previewLandedCostFromHs,
  promoteRepricingToPending,
  reconcileListing,
  type OpsMetricsSnapshot,
  type ReconciliationAlert,
  type RepricingQueueItem,
  type TariffHsRow,
} from "../api/client";

const DEMO_LISTINGS = ["listing-ml-001", "listing-amz-001"];
const RECON_REFS: Record<string, string> = {
  "listing-ml-001": "MLM123456",
  "listing-amz-001": "B0TEST123",
};

export function OpsCenterPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [items, setItems] = useState<RepricingQueueItem[]>([]);
  const [alerts, setAlerts] = useState<ReconciliationAlert[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<OpsMetricsSnapshot | null>(null);
  const [importCsv, setImportCsv] = useState(
    "sku_id,landed_cost_mxn\ndemo-sku-001,1050"
  );
  const [costSheetImportCsv, setCostSheetImportCsv] = useState(
    "sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn\ndemo-sku-001,BATCH-CSV,1000,MXN,0\n"
  );
  const [adjustmentCsv, setAdjustmentCsv] = useState(
    "listing_id,explicit_price_mxn\nlisting-ml-001,1600\n"
  );
  const [tariffRows, setTariffRows] = useState<TariffHsRow[]>([]);
  const [workerCount, setWorkerCount] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [data, alertData, ops, workers, tariffs] = await Promise.all([
        fetchRepricingQueue(locale, DEMO_SKU),
        fetchReconciliationAlerts(locale),
        fetchOpsMetrics(locale),
        fetchWorkerStatus(locale),
        fetchTariffHsRates(locale),
      ]);
      setItems(data.items);
      setAlerts(alertData.items);
      setMetrics(ops);
      setTariffRows(tariffs.items);
      setWorkerCount(workers.workers.filter((w) => !w.stale).length);
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

  const runReconcile = async () => {
    setError(null);
    setMessage(null);
    try {
      for (const listingId of DEMO_LISTINGS) {
        await reconcileListing(locale, listingId, RECON_REFS[listingId]);
      }
      setMessage(t("opsReconcileDone"));
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

      {metrics && (
        <section className="card" data-testid="ops-metrics">
          <h2>{t("opsMetricsTitle")}</h2>
          <dl className="adapter-status-dl">
            <div>
              <dt>{t("opsMetricsCatalog")}</dt>
              <dd>
                <code>{metrics.catalog_driver}</code>
              </dd>
            </div>
            <div>
              <dt>{t("channelAdapterDriver")}</dt>
              <dd>
                <code data-testid="ops-metrics-adapter-driver">
                  {metrics.channel_adapters.driver}
                </code>
              </dd>
            </div>
            <div>
              <dt>{t("channelSandboxBadge")}</dt>
              <dd>
                {metrics.channel_sandbox.mode} ({metrics.channel_sandbox.event_count})
              </dd>
            </div>
            <div>
              <dt>{t("opsMetricsDigestQueue")}</dt>
              <dd>
                {metrics.digest_queue.queued} / {metrics.digest_queue.total}
                {metrics.digest_queue.dead_letter > 0 && (
                  <>
                    {" "}
                    · DLQ {metrics.digest_queue.dead_letter}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>{t("opsMetricsRepricingQueue")}</dt>
              <dd data-testid="ops-metrics-repricing-queue">
                {metrics.repricing_batch_queue.queued} /{" "}
                {metrics.repricing_batch_queue.total} (
                <code>{metrics.repricing_batch_queue.driver}</code>)
              </dd>
            </div>
            <div>
              <dt>{t("opsMetricsNfr")}</dt>
              <dd data-testid="ops-metrics-nfr">
                {t("opsMetricsNfrSimulate", {
                  count: metrics.nfr.pricing_simulate_count,
                  avgMs: metrics.nfr.pricing_calc_duration_ms_avg,
                })}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="card controls">
        <button type="button" onClick={() => void promote()}>
          {t("opsPromotePending")}
        </button>
        <button type="button" onClick={() => void publishBatch()}>
          {t("opsBatchPublish")}
        </button>
        <button type="button" onClick={() => void runReconcile()}>
          {t("opsRunReconcile")}
        </button>
        <button
          type="button"
          data-testid="ops-export-pricing-csv"
          onClick={() => void downloadPricingSnapshotCsv(locale, DEMO_SKU)}
        >
          {t("opsExportPricingCsv")}
        </button>
        <button
          type="button"
          data-testid="ops-version-backup"
          onClick={() => void downloadVersionBackup(locale)}
        >
          {t("opsVersionBackup")}
        </button>
      </section>

      <section className="card" data-testid="ops-landed-cost-import">
        <h2>{t("opsLandedCostImport")}</h2>
        <p className="hint">{t("opsLandedCostImportHint")}</p>
        <textarea
          rows={3}
          value={importCsv}
          onChange={(e) => setImportCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={() =>
            void importLandedCostCsv(locale, importCsv).then((r) =>
              setMessage(
                t("opsLandedCostImportDone", { count: r.updated.length })
              )
            )
          }
        >
          {t("opsLandedCostImportRun")}
        </button>
        {workerCount > 0 && (
          <p className="hint" data-testid="ops-workers-live">
            {t("opsWorkersLive", { count: workerCount })}
          </p>
        )}
      </section>

      <section className="card" data-testid="ops-cost-sheet-import">
        <h2>{t("opsCostSheetImport")}</h2>
        <textarea
          rows={3}
          value={costSheetImportCsv}
          onChange={(e) => setCostSheetImportCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={() =>
            void importCostSheetsCsv(locale, costSheetImportCsv).then((r) =>
              setMessage(t("opsCostSheetImportDone", { count: r.created.length }))
            )
          }
        >
          {t("opsCostSheetImportRun")}
        </button>
      </section>

      <section className="card" data-testid="ops-tariff-hs">
        <h2>{t("opsTariffHs")}</h2>
        <table className="batch-table">
          <thead>
            <tr>
              <th>HS</th>
              <th>{t("opsTariffRate")}</th>
            </tr>
          </thead>
          <tbody>
            {tariffRows.map((row) => (
              <tr key={row.hs_code}>
                <td>
                  <code>{row.hs_code}</code>
                </td>
                <td>{(row.tariff_rate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          data-testid="ops-hs-landed-preview"
          onClick={() =>
            void previewLandedCostFromHs(locale, DEMO_SKU, 1000).then((r) =>
              setMessage(
                t("opsHsLandedPreviewDone", {
                  hs: r.hs_code,
                  landed: r.computed.landed_cost_mxn,
                })
              )
            )
          }
        >
          {t("opsHsLandedPreview")}
        </button>
      </section>

      <section className="card" data-testid="ops-adjustment-preview">
        <h2>{t("opsAdjustmentPreview")}</h2>
        <p className="hint">{t("opsAdjustmentPreviewHint")}</p>
        <textarea
          rows={3}
          value={adjustmentCsv}
          onChange={(e) => setAdjustmentCsv(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={() =>
            void previewAdjustmentPricesCsv(locale, adjustmentCsv).then((r) =>
              setMessage(
                t("opsAdjustmentPreviewDone", {
                  status: r.preview.status,
                  count: r.preview.items.length,
                })
              )
            )
          }
        >
          {t("opsAdjustmentPreviewRun")}
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

      <section className="card">
        <h2>{t("opsReconAlerts")}</h2>
        <table className="batch-table" data-testid="reconciliation-alerts-table">
          <thead>
            <tr>
              <th>{t("channel")}</th>
              <th>{t("opsReconActive")}</th>
              <th>{t("opsReconChannel")}</th>
              <th>{t("opsReconDelta")}</th>
              <th>{t("batchCreated")}</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={5}>{t("opsReconEmpty")}</td>
              </tr>
            ) : (
              alerts.map((a) => (
                <tr key={a.id}>
                  <td>{channelLabel(a.channel)}</td>
                  <td>{a.active_price_mxn}</td>
                  <td>{a.channel_price_mxn}</td>
                  <td>{a.delta_mxn}</td>
                  <td>{new Date(a.created_at).toLocaleString(locale)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
