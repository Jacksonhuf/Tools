import { defineConfig, devices } from "@playwright/test";

const BFF_PORT = process.env.BFF_PORT ?? "3000";
const WEB_PORT = process.env.WEB_PORT ?? "5173";

export default defineConfig({
  testDir: "tests/e2e/web",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `npm run start -w @mx-pricing/bff`,
      url: `http://127.0.0.1:${BFF_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: BFF_PORT,
      },
    },
    {
      command: `npm run preview -w @mx-pricing/web -- --port ${WEB_PORT} --host 127.0.0.1`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
