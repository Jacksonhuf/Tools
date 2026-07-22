import { handle } from "hono/vercel";
import { createApp } from "../apps/bff/dist/app.js";
import { getCatalogRepository } from "../apps/bff/dist/repositories/index.js";

const app = createApp();
const honoHandler = handle(app);

/** Lazy-init catalog (memory or Postgres from DATABASE_URL). */
export default async function handler(req: Request): Promise<Response> {
  getCatalogRepository();
  return honoHandler(req);
}
