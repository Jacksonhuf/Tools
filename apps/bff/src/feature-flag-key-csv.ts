function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function featureFlagKeyToCsv(
  flagKey: string,
  enabled: boolean,
  exportedAt: string
): string {
  return [
    "exported_at,flag_key,enabled",
    [exportedAt, cell(flagKey), enabled ? "true" : "false"].join(","),
    "",
  ].join("\n");
}
