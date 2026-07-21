import { test, expect } from "@playwright/test";

const BFF = process.env.BFF_URL ?? "http://127.0.0.1:3000";
const API_HEADERS = {
  Authorization: "Bearer dev-token",
  "X-Tenant-Id": "tenant-demo",
  "Content-Type": "application/json",
};

/**
 * TC-E2E-CH-001 — Channels tab shows sandbox badge and recent ledger events.
 */
test.describe("Channels sandbox UI", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${BFF}/api/v1/shops/shop-ml-demo/oauth/mock-complete`, {
      headers: API_HEADERS,
      data: {},
    });
    await request.post(
      `${BFF}/api/v1/listings/listing-ml-001/price-versions`,
      {
        headers: API_HEADERS,
        data: { explicit_price_mxn: 1680 },
      }
    );
    await request.post(
      `${BFF}/api/v1/listings/listing-ml-001/channel-publish`,
      {
        headers: API_HEADERS,
        data: {},
      }
    );
  });

  test("sandbox badge and events table list channel_publish", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-channels").click();
    await expect(page.getByTestId("channel-sandbox-badge")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("channel-sandbox-events")).toBeVisible();
    await expect(
      page.getByTestId("channel-sandbox-events").getByText("channel_publish").first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByTestId("channel-sandbox-events").getByText("listing-ml-001").first()
    ).toBeVisible();
  });
});
