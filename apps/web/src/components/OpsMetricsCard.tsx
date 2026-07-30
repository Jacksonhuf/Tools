import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { OpsMetricsSnapshot } from "../api/client";

export function OpsMetricsCard({
  metrics,
  repricingBatchQueued,
  repricingBatchDriver,
  onExport,
}: {
  metrics: OpsMetricsSnapshot;
  repricingBatchQueued: number;
  repricingBatchDriver: string;
  onExport: () => void;
}) {
  const { t } = useTranslation();

  const items = [
    { label: t("opsMetricsCatalog"), value: <code>{metrics.catalog_driver}</code> },
    {
      label: t("channelAdapterDriver"),
      value: (
        <code data-testid="ops-metrics-adapter-driver">
          {metrics.channel_adapters.driver}
        </code>
      ),
    },
    {
      label: t("channelSandboxBadge"),
      value: `${metrics.channel_sandbox.mode} (${metrics.channel_sandbox.event_count})`,
    },
    {
      label: t("opsMetricsDigestQueue"),
      value: (
        <>
          {metrics.digest_queue.queued} / {metrics.digest_queue.total}
          {metrics.digest_queue.dead_letter > 0 && ` · DLQ ${metrics.digest_queue.dead_letter}`}
        </>
      ),
    },
    {
      label: t("opsMetricsRepricingQueue"),
      value: (
        <span data-testid="ops-metrics-repricing-queue">
          {metrics.repricing_batch_queue.queued} / {metrics.repricing_batch_queue.total}{" "}
          (<code>{metrics.repricing_batch_queue.driver}</code>)
        </span>
      ),
    },
    {
      label: t("opsRepricingBatchSummary"),
      value: (
        <span data-testid="ops-repricing-batch-summary">
          {t("opsRepricingBatchSummaryLine", {
            queued: repricingBatchQueued,
            driver: repricingBatchDriver,
          })}
        </span>
      ),
    },
    {
      label: t("opsMetricsNfr"),
      value: (
        <span data-testid="ops-metrics-nfr">
          {t("opsMetricsNfrSimulate", {
            count: metrics.nfr.pricing_simulate_count,
            avgMs: metrics.nfr.pricing_calc_duration_ms_avg,
          })}
        </span>
      ),
    },
  ];

  return (
    <Card data-testid="ops-metrics">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{t("opsMetricsTitle")}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          data-testid="ops-metrics-export"
          onClick={onExport}
        >
          {t("opsMetricsExportCsv")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border bg-muted/30 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
