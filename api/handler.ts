import { handle } from "hono/vercel";
import { createApp } from "../apps/bff/dist/app.js";
import { getCatalogRepository } from "../apps/bff/dist/repositories/index.js";

let honoHandler: ReturnType<typeof handle> | undefined;

export default async function handler(req: Request): Promise<Response> {
  try {
    if (!honoHandler) {
      // Default to in-memory stores on Vercel unless Postgres is explicitly enabled.
      if (process.env.VERCEL === "1" && process.env.VERCEL_USE_PG !== "1") {
        process.env.CATALOG_DRIVER = "memory";
      }
      getCatalogRepository();
      honoHandler = handle(createApp());
    }
    return honoHandler(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "FUNCTION_BOOT_FAILED", message },
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
