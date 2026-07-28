import type { ExportFileRepository } from "./export-file-types.js";
import { MemoryExportFileRepository } from "./memory-export-file.js";
import { PostgresExportFileRepository } from "./postgres-export-file.js";
import { uploadExportToObjectStorage } from "../export-object-storage.js";

let singleton: ExportFileRepository | undefined;

class S3BackedExportFileRepository implements ExportFileRepository {
  readonly driver = "s3" as const;
  private readonly inner: ExportFileRepository;

  constructor(inner: ExportFileRepository) {
    this.inner = inner;
  }

  async create(input: {
    tenant_id: string;
    kind: string;
    content_type: string;
    body: string;
    ttl_sec?: number;
    storage_key?: string | null;
  }) {
    const uploaded = await uploadExportToObjectStorage({
      tenant_id: input.tenant_id,
      kind: input.kind,
      content_type: input.content_type,
      body: input.body,
    });
    if (uploaded) {
      return this.inner.create({
        ...input,
        body: "",
        storage_key: uploaded.storage_key,
      });
    }
    return this.inner.create(input);
  }

  async get(tenantId: string, exportId: string, token: string) {
    return this.inner.get(tenantId, exportId, token);
  }

  async resetForTests(): Promise<void> {
    await this.inner.resetForTests();
  }
}

export function createExportFileRepository(): ExportFileRepository {
  if (process.env.EXPORT_DRIVER === "memory") {
    return new MemoryExportFileRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  const base = url
    ? new PostgresExportFileRepository(url)
    : new MemoryExportFileRepository();
  if (
    process.env.EXPORT_S3_BUCKET?.trim() &&
    process.env.EXPORT_S3_ENDPOINT?.trim()
  ) {
    return new S3BackedExportFileRepository(base);
  }
  return base;
}

export function getExportFileRepository(): ExportFileRepository {
  if (!singleton) {
    singleton = createExportFileRepository();
  }
  return singleton;
}

export function setExportFileRepository(repo: ExportFileRepository): void {
  singleton = repo;
}
