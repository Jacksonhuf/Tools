import { serve } from "@hono/node-server";
import { runMigrations, seedDemoData } from "@mx-pricing/db";
import { createApp } from "./app.js";
import { createCatalogRepository } from "./repositories/index.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    await runMigrations(databaseUrl);
    await seedDemoData(databaseUrl);
    console.log("PostgreSQL migrations and seed complete");
  } else {
    console.log("DATABASE_URL not set — using in-memory catalog");
  }
  createCatalogRepository();
  const port = Number(process.env.PORT ?? 3000);
  const app = createApp();
  serve({ fetch: app.fetch, port }, () => {
    console.log(`BFF listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
