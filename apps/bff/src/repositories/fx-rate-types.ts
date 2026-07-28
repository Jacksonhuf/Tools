export interface FxRateRow {
  base: string;
  quote: string;
  rate: number;
  buffer_pct: number;
  effective_from: string;
  source: string;
}

export interface FxRateRepository {
  readonly driver: "memory" | "postgres";
  list(tenantId: string): Promise<FxRateRow[]>;
  get(tenantId: string, base: string, quote: string): Promise<FxRateRow | undefined>;
  upsert(tenantId: string, row: FxRateRow): Promise<FxRateRow[]>;
  resetForTests(): Promise<void>;
}
