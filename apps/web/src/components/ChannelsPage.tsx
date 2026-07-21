import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchShops,
  mockCompleteShopOAuth,
  publishShopChannelPrice,
  pullShopListing,
  startShopOAuth,
  type ShopSummary,
} from "../api/client";

const DEMO_REFS: Record<string, string> = {
  MERCADO_LIBRE: "MLM123456",
  AMAZON_MX: "B0TEST123",
};

export function ChannelsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchShops(locale);
      setShops(data.items);
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
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section className="card">
        <h2>{t("shopList")}</h2>
        <table className="batch-table shop-table" data-testid="shops-table">
          <thead>
            <tr>
              <th>{t("channel")}</th>
              <th>{t("shopName")}</th>
              <th>{t("batchStatus")}</th>
              <th>{t("shopSellerId")}</th>
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
    </div>
  );
}
