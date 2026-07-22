import type { buildOpsMetricsSnapshot } from "./ops-metrics.js";

type OpsMetricsSnapshot = Awaited<
  ReturnType<typeof buildOpsMetricsSnapshot>
>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function opsMetricsToCsv(
  snapshot: OpsMetricsSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,tenant_id,catalog_driver,sandbox_enabled,sandbox_mode,sandbox_events,adapter_driver,adapter_ready,digest_queued,digest_failed,digest_dead_letter,repricing_batch_queued,repricing_batch_total,nfr_simulate_count,nfr_pricing_avg_ms",
  ];
  lines.push(
    [
      exportedAt,
      cell(snapshot.tenant_id),
      cell(snapshot.catalog_driver),
      snapshot.channel_sandbox.enabled ? "true" : "false",
      cell(snapshot.channel_sandbox.mode),
      snapshot.channel_sandbox.event_count,
      cell(snapshot.channel_adapters.driver),
      snapshot.channel_adapters.ready ? "true" : "false",
      snapshot.digest_queue.queued,
      snapshot.digest_queue.failed,
      snapshot.digest_queue.dead_letter,
      snapshot.repricing_batch_queue.queued,
      snapshot.repricing_batch_queue.total,
      snapshot.nfr.pricing_simulate_count,
      snapshot.nfr.pricing_calc_duration_ms_avg,
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
