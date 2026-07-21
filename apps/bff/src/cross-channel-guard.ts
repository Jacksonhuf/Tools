import { evaluateCrossChannelSpread } from "@mx-pricing/pricing-engine";
import type { CatalogRepository } from "./repositories/types.js";

export async function getCrossChannelGuardForSku(
  catalog: CatalogRepository,
  skuId: string
) {
  const versions = await catalog.listVersions(skuId);
  const activeMl = versions.find(
    (v) => v.state === "active" && v.channel === "MERCADO_LIBRE"
  );
  const activeAmz = versions.find(
    (v) => v.state === "active" && v.channel === "AMAZON_MX"
  );
  const warning = evaluateCrossChannelSpread({
    mercado_libre_price_mxn: activeMl?.publish_price_mxn ?? null,
    amazon_mx_price_mxn: activeAmz?.publish_price_mxn ?? null,
  });
  return {
    mercado_libre_active_mxn: activeMl?.publish_price_mxn ?? null,
    amazon_mx_active_mxn: activeAmz?.publish_price_mxn ?? null,
    warning,
  };
}
