import type { TariffHsRow, TariffHsRepository } from "./tariff-hs-types.js";

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

export class MemoryTariffHsRepository implements TariffHsRepository {
  readonly driver = "memory" as const;

  async list(tenantId: string): Promise<TariffHsRow[]> {
    return byTenant.get(tenantId) ?? [...DEFAULT_ROWS];
  }

  async get(tenantId: string, hsCode: string) {
    const rows = await this.list(tenantId);
    return rows.find((r) => r.hs_code === hsCode);
  }

  async upsert(tenantId: string, row: TariffHsRow): Promise<TariffHsRow[]> {
    const list = [...(await this.list(tenantId))];
    const idx = list.findIndex((r) => r.hs_code === row.hs_code);
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    byTenant.set(tenantId, list);
    return list;
  }

  async resetForTests(): Promise<void> {
    byTenant.clear();
  }
}
