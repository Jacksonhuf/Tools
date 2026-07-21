import { test, expect } from "@playwright/test";

const BFF = process.env.BFF_URL ?? "http://127.0.0.1:3000";
const API_HEADERS = {
  Authorization: "Bearer dev-token",
  "X-Tenant-Id": "tenant-demo",
  "Content-Type": "application/json",
};

/**
 * TC-E2E-ADJ-004 — adjustment approval UI flow (finance/ops approves then apply).
 */
test.describe("Adjustment approval E2E", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(
      `${BFF}/api/v1/listings/listing-ml-001/price-versions`,
      {
        headers: API_HEADERS,
        data: { explicit_price_mxn: 1600 },
      }
    );
  });

  test("create pending_approval batch, approve, apply", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Adjustments|调价|Lotes de ajuste/i }).click();
    await expect(page.getByTestId("adjustment-batches-page")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("adjustment-price-ml").fill("1510");
    await page.getByTestId("adjustment-create-batch").click();

    await expect(page.locator(".status-pending_approval").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("adjustment-approve").click();
    await expect(page.locator(".status-approved").first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("adjustment-apply").click();
    await expect(page.locator(".status-applied").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
