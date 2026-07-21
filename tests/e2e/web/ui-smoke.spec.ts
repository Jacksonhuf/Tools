import { test, expect } from "@playwright/test";

/**
 * TC-E2E-I18N-003 / dual-channel load (P0-E8-04 Playwright scaffold).
 */
test.describe("Web smoke", () => {
  test("pricing dual column and Copilot tab", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("dual-channel-grid")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByLabel("language").selectOption("en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Pricing|Precios|定价/
    );

    await page.getByRole("button", { name: /Copilot/i }).click();
    await expect(page.getByTestId("p4-readiness")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("copilot-chat")).toBeVisible();
  });
});
