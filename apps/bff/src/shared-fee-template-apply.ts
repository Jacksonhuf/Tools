import type { CatalogRepository } from "./repositories/types.js";
import { getSharedFeeTemplate } from "./tenant-fee-template-share.js";

export async function applySharedFeeTemplateToSku(
  catalog: CatalogRepository,
  tenantId: string,
  skuId: string,
  templateId: string
) {
  const tpl = getSharedFeeTemplate(tenantId, templateId);
  if (!tpl) return undefined;
  const sku = await catalog.updateSkuChannelFee(
    tenantId,
    skuId,
    tpl.channel,
    tpl.template
  );
  if (!sku) return undefined;
  return {
    sku_id: sku.id,
    channel: tpl.channel,
    applied_template_id: tpl.id,
    fee_template: tpl.template,
  };
}
