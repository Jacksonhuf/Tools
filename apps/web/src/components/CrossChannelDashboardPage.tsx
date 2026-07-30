import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchCrossChannelDashboard,
  downloadCrossChannelDashboardCsv,
  downloadCrossChannelDashboardRowCsv,
  type CrossChannelDashboardSnapshot,
} from "../api/client";
import { PageIntent } from "@/components/patterns/PageIntent";
import { KpiStrip } from "@/components/patterns/KpiStrip";
import { ExportHub } from "@/components/patterns/ExportHub";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
} from "@/components/patterns/DataTable";
import { KpiMetric } from "@/components/primitives/KpiMetric";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-4">
      <PageIntent
        title={t("crossChannelDashboardTitle")}
        description={t("crossChannelDashboardHint")}
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

      {data && (
        <>
          <KpiStrip>
            <KpiMetric
              label={t("crossChannelSkuCode")}
              value={data.sku_count}
              data-testid="cross-channel-dashboard"
            />
            <KpiMetric
              label={t("crossChannelSpread")}
              value={data.alert_count}
              trend={
                data.alert_count > 0
                  ? t("crossChannelDashboardSummary", {
                      skus: data.sku_count,
                      alerts: data.alert_count,
                    })
                  : undefined
              }
            />
          </KpiStrip>

          <ExportHub
            title={t("crossChannelExportCsv")}
            description={t("exportHubHint")}
          >
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
            <button
              type="button"
              data-testid="cross-channel-row-export"
              disabled={!data.items[0]}
              onClick={() => {
                const skuId = data.items[0]?.sku_id;
                if (!skuId) return;
                void downloadCrossChannelDashboardRowCsv(locale, skuId).then(
                  () => setMessage(t("crossChannelRowExportDone"))
                );
              }}
            >
              {t("crossChannelRowExportCsv")}
            </button>
          </ExportHub>

          <DataTable testId="cross-channel-table" maxHeight={false}>
            <DataTableRoot>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>{t("crossChannelSkuCode")}</DataTableHead>
                  <DataTableHead>{t("mercadoLibre")}</DataTableHead>
                  <DataTableHead>{t("amazonMx")}</DataTableHead>
                  <DataTableHead>{t("crossChannelSpread")}</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {data.items.map((row) => (
                  <DataTableRow key={row.sku_id}>
                    <DataTableCell>
                      <code className="text-xs">{row.sku_code}</code>
                    </DataTableCell>
                    <DataTableCell>{row.mercado_libre_active_mxn ?? "—"}</DataTableCell>
                    <DataTableCell>{row.amazon_mx_active_mxn ?? "—"}</DataTableCell>
                    <DataTableCell>
                      {row.warning ? (
                        <Badge
                          variant="outline"
                          className="border-warning/40 bg-warning/10 text-warning"
                          data-testid={`xch-alert-${row.sku_id}`}
                        >
                          {row.warning.spread_pct.toFixed(1)}%
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTableRoot>
          </DataTable>
        </>
      )}

      {!data && !error && (
        <div className="flex items-center justify-center py-16">
          <Button type="button" variant="outline" onClick={() => void load()}>
            {t("crossChannelDashboardTitle")}
          </Button>
        </div>
      )}
    </div>
  );
}
