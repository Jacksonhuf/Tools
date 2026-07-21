import type { ReconciliationAlertRepository } from "./repositories/reconciliation-types.js";

export function reconciliationAlertsToCsv(
  items: Awaited<
    ReturnType<ReconciliationAlertRepository["listAlerts"]>
  >,
  exportedAt: string
): string {
  const header =
    "exported_at,id,listing_id,channel,active_price_mxn,channel_price_mxn,delta_mxn,severity,created_at";
  const lines = items.map((a) =>
    [
      exportedAt,
      a.id,
      a.listing_id,
      a.channel,
      a.active_price_mxn,
      a.channel_price_mxn,
      a.delta_mxn,
      a.severity,
      a.created_at,
    ].join(",")
  );
  return [header, ...lines].join("\n");
}
