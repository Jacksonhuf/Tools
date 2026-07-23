import type { buildVersionBackupSnapshot } from "./version-backup-service.js";
import type { PriceVersionRecord } from "./version-store.js";

type VersionBackupSnapshot = Awaited<
  ReturnType<typeof buildVersionBackupSnapshot>
>;

function cell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function versionBackupToCsv(
  snapshot: VersionBackupSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,tenant_id,sku_count,version_count,catalog_driver,version_id,sku_id,channel,state,publish_price_mxn,created_at",
  ];
  for (const v of snapshot.versions as Array<
    PriceVersionRecord & { tenant_id: string }
  >) {
    lines.push(
      [
        exportedAt,
        cell(snapshot.tenant_id),
        snapshot.sku_count,
        snapshot.version_count,
        cell(snapshot.catalog_driver),
        cell(v.id),
        cell(v.sku_id),
        cell(v.channel),
        cell(v.state),
        v.publish_price_mxn,
        cell(v.created_at),
      ].join(",")
    );
  }
  if (snapshot.versions.length === 0) {
    lines.push(
      [
        exportedAt,
        cell(snapshot.tenant_id),
        snapshot.sku_count,
        snapshot.version_count,
        cell(snapshot.catalog_driver),
        "",
        "",
        "",
        "",
        "",
        "",
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
