import type { Page } from "@playwright/test";

/** shadcn Select language picker (combobox, not native <select>). */
export async function selectWebLanguage(page: Page, code: "zh-CN" | "en" | "es-MX") {
  const labels: Record<typeof code, string> = {
    "zh-CN": "中文",
    en: "English",
    "es-MX": "Español (MX)",
  };
  await page.getByLabel("language").click();
  await page.getByRole("option", { name: labels[code] }).click();
}
