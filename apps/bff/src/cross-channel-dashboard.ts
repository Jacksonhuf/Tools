import type { CatalogRepository } from "./repositories/types.js";
import { getCrossChannelGuardForSku } from "./cross-channel-guard.js";

export async function buildCrossChannelDashboard(
  catalog: CatalogRepository,
  tenantId: string
) {
  const skus = await catalog.listSkus(tenantId);
  const items = await Promise.all(
    skus.map(async (sku) => {
      const guard = await getCrossChannelGuardForSku(catalog, sku.id);
      return {
        sku_id: sku.id,
        sku_code: sku.sku_code,
        name: sku.name,
        mercado_libre_active_mxn: guard.mercado_libre_active_mxn,
        amazon_mx_active_mxn: guard.amazon_mx_active_mxn,
        warning: guard.warning,
      };
    })
  );
  const alerts = items.filter((i) => i.warning !== null).length;
  return {
    tenant_id: tenantId,
    sku_count: items.length,
    alert_count: alerts,
    items,
    generated_at: new Date().toISOString(),
  };
}
