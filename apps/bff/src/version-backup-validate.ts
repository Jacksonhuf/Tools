export interface VersionBackupSnapshot {
  tenant_id: string;
  sku_count: number;
  version_count: number;
  catalog_driver: string;
  versions: Array<{
    id: string;
    sku_id: string;
    channel: string;
    state: string;
    publish_price_mxn: number;
    tenant_id?: string;
  }>;
  exported_at: string;
}

export function validateVersionBackupSnapshot(
  snapshot: unknown
): { valid: boolean; errors: string[]; summary: { version_count: number } } {
  const errors: string[] = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { valid: false, errors: ["NOT_OBJECT"], summary: { version_count: 0 } };
  }
  const s = snapshot as VersionBackupSnapshot;
  if (!s.tenant_id) errors.push("MISSING_TENANT_ID");
  if (!Array.isArray(s.versions)) errors.push("MISSING_VERSIONS");
  else {
    for (let i = 0; i < s.versions.length; i++) {
      const v = s.versions[i];
      if (!v?.id || !v.sku_id || !v.channel) {
        errors.push(`VERSION_${i}_INVALID`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: { version_count: s.versions?.length ?? 0 },
  };
}
