import { randomBytes } from "node:crypto";

export async function uploadExportToObjectStorage(input: {
  tenant_id: string;
  kind: string;
  content_type: string;
  body: string;
}): Promise<{ storage_key: string; public_url?: string } | null> {
  const bucket = process.env.EXPORT_S3_BUCKET?.trim();
  const endpoint = process.env.EXPORT_S3_ENDPOINT?.trim();
  if (!bucket || !endpoint) {
    return null;
  }
  const key = `exports/${input.tenant_id}/${input.kind}/${Date.now()}-${randomBytes(4).toString("hex")}.csv`;
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": input.content_type,
      ...(process.env.EXPORT_S3_ACCESS_KEY
        ? {
            Authorization: `Bearer ${process.env.EXPORT_S3_ACCESS_KEY}`,
          }
        : {}),
    },
    body: input.body,
  });
  if (!res.ok) {
    console.error("S3 export upload failed", res.status, await res.text());
    return null;
  }
  return { storage_key: key, public_url: url };
}

export function objectStorageStatus() {
  return {
    configured: Boolean(
      process.env.EXPORT_S3_BUCKET?.trim() &&
        process.env.EXPORT_S3_ENDPOINT?.trim()
    ),
    bucket: process.env.EXPORT_S3_BUCKET?.trim() || null,
    endpoint: process.env.EXPORT_S3_ENDPOINT?.trim() || null,
  };
}
