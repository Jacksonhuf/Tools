import type { getCrossChannelGuardForSku } from "./cross-channel-guard.js";

type CrossChannelGuardSnapshot = Awaited<
  ReturnType<typeof getCrossChannelGuardForSku>
>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function crossChannelGuardToCsv(
  skuId: string,
  guard: CrossChannelGuardSnapshot,
  exportedAt: string
): string {
  const w = guard.warning;
  const lines = [
    "exported_at,sku_id,mercado_libre_active_mxn,amazon_mx_active_mxn,warning_active,spread_pct,max_spread_pct,warning_code",
  ];
  lines.push(
    [
      exportedAt,
      cell(skuId),
      cell(guard.mercado_libre_active_mxn),
      cell(guard.amazon_mx_active_mxn),
      w ? "true" : "false",
      w ? w.spread_pct : "",
      w ? w.max_spread_pct : "",
      w ? cell(w.code) : "",
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
