export interface TariffHsRow {
  hs_code: string;
  description: string;
  tariff_rate: number;
  customs_fee_mxn: number;
}

export interface TariffHsRepository {
  readonly driver: "memory" | "postgres";
  list(tenantId: string): Promise<TariffHsRow[]>;
  get(tenantId: string, hsCode: string): Promise<TariffHsRow | undefined>;
  upsert(tenantId: string, row: TariffHsRow): Promise<TariffHsRow[]>;
  resetForTests(): Promise<void>;
}
