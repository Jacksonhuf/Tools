import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchChannelAdapterStatus,
  downloadChannelAdapterStatusCsv,
  downloadChannelSandboxStatusCsv,
  fetchChannelSandboxEvents,
  downloadChannelSandboxEventsCsv,
  downloadChannelSandboxEventCsv,
  downloadShopsCsv,
  downloadShopCsv,
  downloadListingCsv,
  downloadListingSyncJobsForListingCsv,
  downloadListingSyncOpsStatusCsv,
  downloadReconciliationAlertsDirectCsv,
  fetchChannelSandboxStatus,
  fetchShops,
  mockCompleteShopOAuth,
  publishShopChannelPrice,
  pullShopListing,
  startShopOAuth,
  syncListingChannel,
  fetchListingSyncJobsForListing,
  type ChannelAdapterStatus,
  type ChannelSandboxEvent,
  type ShopSummary,
} from "../api/client";

const DEMO_REFS: Record<string, string> = {
  MERCADO_LIBRE: "MLM123456",
  AMAZON_MX: "B0TEST123",
};

const SHOP_LISTING_ID: Record<string, string> = {
  "shop-ml-demo": "listing-ml-001",
  "shop-amz-demo": "listing-amz-001",
};

export function ChannelsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sandboxNote, setSandboxNote] = useState<string | null>(null);
  const [sandboxEvents, setSandboxEvents] = useState<ChannelSandboxEvent[]>([]);
  const [adapterStatus, setAdapterStatus] = useState<ChannelAdapterStatus | null>(
    null
  );
  const [lastSyncByListing, setLastSyncByListing] = useState<
    Record<string, { status: string; price: number | null }>
  >({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const [data, sandbox, events, adapters] = await Promise.all([
        fetchShops(locale),
        fetchChannelSandboxStatus(locale),
        fetchChannelSandboxEvents(locale, 25),
        fetchChannelAdapterStatus(locale),
      ]);
      setShops(data.items);
      setSandboxNote(sandbox.enabled ? sandbox.note : null);
      setSandboxEvents(sandbox.enabled ? events.items : []);
      setAdapterStatus(adapters);
      const syncEntries = await Promise.all(
        Object.values(SHOP_LISTING_ID).map(async (listingId) => {
          try {
            const jobs = await fetchListingSyncJobsForListing(locale, listingId);
            const latest = jobs.items[0];
            return [
              listingId,
              latest
                ? {
                    status: latest.status,
                    price: latest.channel_price_mxn,
                  }
                : null,
            ] as const;
          } catch {
            return [listingId, null] as const;
          }
        })
      );
      const syncMap: Record<string, { status: string; price: number | null }> =
        {};
      for (const [listingId, row] of syncEntries) {
        if (row) syncMap[listingId] = row;
      }
      setLastSyncByListing(syncMap);
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    try {
      const start = await startShopOAuth(locale, shop.id);
      await mockCompleteShopOAuth(locale, shop.id, start.state);
      setMessage(t("shopConnected", { name: shop.name }));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const publishActive = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    try {
      const { ok, json } = await publishShopChannelPrice(locale, shop.id, {
        retry_on_step: true,
      });
      if (ok && json.publish_status === "published") {
        const retried =
          "retried" in json && json.retried ? ` (${t("channelPublishRetried")})` : "";
        setMessage(
          `${t("channelPublishOk")}: ${json.channel_price_mxn} MXN${retried}`
        );
        await load();
      } else if (!ok && json.publish_status === "failed") {
        setError(`${t("channelPublishFail")}: ${json.error_code}`);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const pull = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    const ref = DEMO_REFS[shop.channel] ?? "demo-ref";
    try {
      const result = await pullShopListing(locale, shop.id, ref);
      setMessage(
        `${t("listingPulled")}: ${result.snapshot.external_item_id} → ${result.snapshot.price_mxn} MXN`
      );
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const syncListingJob = async (shop: ShopSummary) => {
    setError(null);
    setMessage(null);
    const listingId =
      shop.channel === "MERCADO_LIBRE" ? "listing-ml-001" : "listing-amz-001";
    const ref = DEMO_REFS[shop.channel] ?? "demo-ref";
    try {
      const result = await syncListingChannel(locale, listingId, ref);
      setMessage(
        `${t("listingSyncDone")}: ${result.job.id} → ${result.snapshot.price_mxn} MXN`
      );
    } catch (e) {
      setError(String(e));
    }
  };

  const channelLabel = (ch: string) =>
    ch === "MERCADO_LIBRE" ? t("mercadoLibre") : t("amazonMx");

  return (
    <div className="page page-wide">
      <h1>{t("channelsTitle")}</h1>
      <p className="hint">{t("channelsHint")}</p>
      {sandboxNote && (
        <p className="hint" data-testid="channel-sandbox-badge">
          {t("channelSandboxBadge")}: {sandboxNote}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}
      <div className="shop-actions">
        <button
          type="button"
          data-testid="channel-sandbox-status-export"
          onClick={() =>
            void downloadChannelSandboxStatusCsv(locale).then(() =>
              setMessage(t("channelSandboxStatusExportDone"))
            )
          }
        >
          {t("channelSandboxStatusExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-shops-export"
          onClick={() =>
            void downloadShopsCsv(locale).then(() =>
              setMessage(t("shopsExportDone"))
            )
          }
        >
          {t("shopsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-shop-export"
          onClick={() =>
            void downloadShopCsv(locale, "shop-ml-demo").then(() =>
              setMessage(t("shopExportDone"))
            )
          }
        >
          {t("shopExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-export"
          onClick={() =>
            void downloadListingCsv(locale, "listing-ml-001").then(() =>
              setMessage(t("listingExportDone"))
            )
          }
        >
          {t("listingExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channel-listing-sync-export"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-ml-001"
            ).then(() => setMessage(t("channelListingSyncExportDone")))
          }
        >
          {t("channelListingSyncExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channel-listing-sync-export-amz"
          onClick={() =>
            void downloadListingSyncJobsForListingCsv(
              locale,
              "listing-amz-001"
            ).then(() => setMessage(t("channelListingSyncAmzExportDone")))
          }
        >
          {t("channelListingSyncAmzExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-listing-sync-ops-export"
          onClick={() =>
            void downloadListingSyncOpsStatusCsv(locale).then(() =>
              setMessage(t("channelsListingSyncOpsExportDone"))
            )
          }
        >
          {t("channelsListingSyncOpsExportCsv")}
        </button>
        <button
          type="button"
          data-testid="channels-reconciliation-direct-export"
          onClick={() =>
            void downloadReconciliationAlertsDirectCsv(locale).then(() =>
              setMessage(t("channelsReconciliationDirectExportDone"))
            )
          }
        >
          {t("channelsReconciliationDirectExportCsv")}
        </button>
      </div>

      {adapterStatus && (
        <section className="card" data-testid="channel-adapter-status">
          <h2>{t("channelAdapterTitle")}</h2>
          <p className="hint">{adapterStatus.note}</p>
          <dl className="adapter-status-dl">
            <div>
              <dt>{t("channelAdapterDriver")}</dt>
              <dd>
                <code data-testid="channel-adapter-driver">
                  {adapterStatus.driver}
                </code>
              </dd>
            </div>
            <div>
              <dt>{t("batchStatus")}</dt>
              <dd>
                <span
                  className={`status status-${adapterStatus.ready ? "connected" : "disconnected"}`}
                  data-testid="channel-adapter-ready"
                >
                  {adapterStatus.ready
                    ? t("channelAdapterReady")
                    : t("channelAdapterNotReady")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("channelAdapterPublishHttp")}</dt>
              <dd>
                {adapterStatus.publish_http_url_configured
                  ? t("channelAdapterConfigured")
                  : t("channelAdapterNotConfigured")}
              </dd>
            </div>
            <div>
              <dt>{t("channelAdapterPullHttp")}</dt>
              <dd>
                {adapterStatus.listing_pull_http_url_configured
                  ? t("channelAdapterConfigured")
                  : t("channelAdapterNotConfigured")}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            data-testid="channel-adapter-export"
            onClick={() =>
              void downloadChannelAdapterStatusCsv(locale).then(() =>
                setMessage(t("channelAdapterExportDone"))
              )
            }
          >
            {t("channelAdapterExportCsv")}
          </button>
        </section>
      )}

      <section className="card">
        <h2>{t("shopList")}</h2>
        <table className="batch-table shop-table" data-testid="shops-table">
          <thead>
            <tr>
              <th>{t("channel")}</th>
              <th>{t("shopName")}</th>
              <th>{t("batchStatus")}</th>
              <th>{t("shopSellerId")}</th>
              <th>{t("channelLastListingSyncCol")}</th>
              <th>{t("shopActions")}</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{channelLabel(shop.channel)}</td>
                <td>{shop.name}</td>
                <td>
                  <span className={`status status-${shop.auth_status}`}>
                    {shop.auth_status}
                  </span>
                </td>
                <td>{shop.external_seller_id ?? "—"}</td>
                <td>
                  {SHOP_LISTING_ID[shop.id] &&
                    lastSyncByListing[SHOP_LISTING_ID[shop.id]] && (
                      <span
                        className="hint"
                        data-testid={`channel-last-sync-${shop.id}`}
                      >
                        {t("channelLastListingSync", {
                          status:
                            lastSyncByListing[SHOP_LISTING_ID[shop.id]].status,
                          price:
                            lastSyncByListing[SHOP_LISTING_ID[shop.id]].price ??
                            "—",
                        })}
                      </span>
                    )}
                </td>
                <td className="shop-actions">
                  {shop.auth_status !== "connected" ? (
                    <button type="button" onClick={() => void connect(shop)}>
                      {t("connectShop")}
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => void pull(shop)}>
                        {t("pullListing")}
                      </button>
                      <button
                        type="button"
                        data-testid="listing-sync-run"
                        onClick={() => void syncListingJob(shop)}
                      >
                        {t("listingSyncRun")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void publishActive(shop)}
                      >
                        {t("publishToChannel")}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {sandboxNote && (
        <section className="card">
          <h2>{t("channelSandboxEventsTitle")}</h2>
          <div className="shop-actions">
            <button
              type="button"
              data-testid="channel-sandbox-export"
              onClick={() =>
                void downloadChannelSandboxEventsCsv(locale).then(() =>
                  setMessage(t("channelSandboxExportDone"))
                )
              }
            >
              {t("channelSandboxExportCsv")}
            </button>
            <button
              type="button"
              data-testid="channel-sandbox-event-export"
              disabled={!sandboxEvents[0]}
              onClick={() => {
                const eventId = sandboxEvents[0]?.id;
                if (!eventId) return;
                void downloadChannelSandboxEventCsv(locale, eventId).then(() =>
                  setMessage(t("channelSandboxEventExportDone"))
                );
              }}
            >
              {t("channelSandboxEventExportCsv")}
            </button>
          </div>
          {sandboxEvents.length === 0 ? (
            <p className="hint" data-testid="channel-sandbox-events-empty">
              {t("channelSandboxNoEvents")}
            </p>
          ) : (
            <table
              className="batch-table shop-table"
              data-testid="channel-sandbox-events"
            >
              <thead>
                <tr>
                  <th>{t("channelSandboxEventTime")}</th>
                  <th>{t("channelSandboxEventType")}</th>
                  <th>{t("channel")}</th>
                  <th>{t("channelSandboxListing")}</th>
                </tr>
              </thead>
              <tbody>
                {sandboxEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.created_at).toLocaleString(locale)}</td>
                    <td>
                      <code>{ev.event_type}</code>
                    </td>
                    <td>{channelLabel(ev.channel)}</td>
                    <td>{ev.listing_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
