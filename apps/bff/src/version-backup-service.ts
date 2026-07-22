import type { CatalogRepository } from "./repositories/types.js";
import type { PriceVersionRecord } from "./version-store.js";

export async function buildVersionBackupSnapshot(
  catalog: CatalogRepository,
  tenantId: string
) {
  const skus = await catalog.listSkus(tenantId);
  const versions: Array<PriceVersionRecord & { tenant_id: string }> = [];
  for (const sku of skus) {
    const list = await catalog.listVersions(sku.id);
    for (const v of list) {
      versions.push({ ...v, tenant_id: tenantId });
    }
  }
  return {
    tenant_id: tenantId,
    sku_count: skus.length,
    version_count: versions.length,
    catalog_driver: catalog.driver,
    versions,
    exported_at: new Date().toISOString(),
  };
}
