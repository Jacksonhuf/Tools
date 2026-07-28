import type { StoredExport } from "./export-file-types.js";
import { getExportFileRepository } from "./repositories/export-file-index.js";

export type { StoredExport } from "./export-file-types.js";

export async function createStoredExport(input: {
  tenant_id: string;
  kind: string;
  content_type: string;
  body: string;
  ttl_sec?: number;
}): Promise<{ export_id: string; token: string; expires_at: string }> {
  return getExportFileRepository().create(input);
}

export async function getStoredExport(
  tenantId: string,
  exportId: string,
  token: string
): Promise<StoredExport | undefined> {
  return getExportFileRepository().get(tenantId, exportId, token);
}

export function resetStoredExportsForTests(): void {
  void getExportFileRepository().resetForTests();
}

export function getExportStoreStatus() {
  return {
    driver: getExportFileRepository().driver,
  };
}
