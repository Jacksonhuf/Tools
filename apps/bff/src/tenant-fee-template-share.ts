export interface SharedFeeTemplate {
  id: string;
  tenant_id: string;
  channel: "MERCADO_LIBRE" | "AMAZON_MX";
  category_id: string;
  name: string;
  template: {
    commission_pct_of_price: number;
    payment_pct_of_price: number;
    fulfillment_fixed_mxn: number;
  };
}

const SHARED: SharedFeeTemplate[] = [
  {
    id: "fee-tpl-ml-electronics",
    tenant_id: "tenant-demo",
    channel: "MERCADO_LIBRE",
    category_id: "cat-electronics-mx",
    name: "ML Electronics shared",
    template: {
      commission_pct_of_price: 18,
      payment_pct_of_price: 3,
      fulfillment_fixed_mxn: 40,
    },
  },
  {
    id: "fee-tpl-amz-electronics",
    tenant_id: "tenant-demo",
    channel: "AMAZON_MX",
    category_id: "cat-electronics-mx",
    name: "Amazon MX Electronics shared",
    template: {
      commission_pct_of_price: 15,
      payment_pct_of_price: 0,
      fulfillment_fixed_mxn: 55,
    },
  },
];

export function listSharedFeeTemplates(tenantId: string): SharedFeeTemplate[] {
  return SHARED.filter((t) => t.tenant_id === tenantId);
}

export function getSharedFeeTemplate(
  tenantId: string,
  templateId: string
): SharedFeeTemplate | undefined {
  return SHARED.find((t) => t.tenant_id === tenantId && t.id === templateId);
}
