export interface TariffHsRow {
  hs_code: string;
  description: string;
  tariff_rate: number;
  customs_fee_mxn: number;
}

const DEFAULT_ROWS: TariffHsRow[] = [
  {
    hs_code: "HS-ELECTRONICS-MX",
    description: "Electronics (demo)",
    tariff_rate: 0.05,
    customs_fee_mxn: 0,
  },
  {
    hs_code: "8517.12.00",
    description: "Telephones for cellular networks",
    tariff_rate: 0.05,
    customs_fee_mxn: 0,
  },
];

const byTenant = new Map<string, TariffHsRow[]>();

export function listTariffHsRates(tenantId: string): TariffHsRow[] {
  return byTenant.get(tenantId) ?? [...DEFAULT_ROWS];
}

export function getTariffHsRate(
  tenantId: string,
  hsCode: string
): TariffHsRow | undefined {
  return listTariffHsRates(tenantId).find((r) => r.hs_code === hsCode);
}

export function upsertTariffHsRate(
  tenantId: string,
  row: TariffHsRow
): TariffHsRow[] {
  const list = [...listTariffHsRates(tenantId)];
  const idx = list.findIndex((r) => r.hs_code === row.hs_code);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  byTenant.set(tenantId, list);
  return list;
}

export function resetTariffHsForTests(): void {
  byTenant.clear();
}
