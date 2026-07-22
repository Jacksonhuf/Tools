export interface FxRateRow {
  base: string;
  quote: string;
  rate: number;
  buffer_pct: number;
  effective_from: string;
  source: string;
}

const DEFAULT_RATES: FxRateRow[] = [
  {
    base: "USD",
    quote: "MXN",
    rate: 20,
    buffer_pct: 2,
    effective_from: "2026-01-01T00:00:00.000Z",
    source: "demo-table",
  },
];

const byTenant = new Map<string, FxRateRow[]>();

export function listFxRates(tenantId: string): FxRateRow[] {
  return byTenant.get(tenantId) ?? [...DEFAULT_RATES];
}

export function upsertFxRate(tenantId: string, row: FxRateRow): FxRateRow[] {
  const list = [...listFxRates(tenantId)];
  const idx = list.findIndex(
    (r) => r.base === row.base && r.quote === row.quote
  );
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  byTenant.set(tenantId, list);
  return list;
}

export function getFxRate(
  tenantId: string,
  base: string,
  quote: string
): FxRateRow | undefined {
  return listFxRates(tenantId).find((r) => r.base === base && r.quote === quote);
}

export function resetFxRatesForTests(): void {
  byTenant.clear();
}
