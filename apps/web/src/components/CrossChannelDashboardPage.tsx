import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchCrossChannelDashboard,
  downloadCrossChannelDashboardCsv,
  type CrossChannelDashboardSnapshot,
} from "../api/client";

export function CrossChannelDashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [data, setData] = useState<CrossChannelDashboardSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchCrossChannelDashboard(locale));
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page page-wide">
      <h1>{t("crossChannelDashboardTitle")}</h1>
      <p className="hint">{t("crossChannelDashboardHint")}</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}
      {data && (
        <section className="card" data-testid="cross-channel-dashboard">
          <p>
            {t("crossChannelDashboardSummary", {
              skus: data.sku_count,
              alerts: data.alert_count,
            })}
          </p>
          <button
            type="button"
            data-testid="cross-channel-export"
            onClick={() =>
              void downloadCrossChannelDashboardCsv(locale).then(() =>
                setMessage(t("crossChannelExportDone"))
              )
            }
          >
            {t("crossChannelExportCsv")}
          </button>
          <table className="batch-table">
            <thead>
              <tr>
                <th>{t("crossChannelSkuCode")}</th>
                <th>{t("mercadoLibre")}</th>
                <th>{t("amazonMx")}</th>
                <th>{t("crossChannelSpread")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.sku_id}>
                  <td>
                    <code>{row.sku_code}</code>
                  </td>
                  <td>{row.mercado_libre_active_mxn ?? "—"}</td>
                  <td>{row.amazon_mx_active_mxn ?? "—"}</td>
                  <td>
                    {row.warning ? (
                      <span
                        className="status status-pending_approval"
                        data-testid={`xch-alert-${row.sku_id}`}
                      >
                        {row.warning.spread_pct.toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
