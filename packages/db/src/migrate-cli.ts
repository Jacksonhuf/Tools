import { runMigrations, seedDemoData } from "./migrate.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}
await runMigrations(url);
await seedDemoData(url);
console.log("Migrations and seed OK");
