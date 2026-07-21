import { describe, expect, it } from "vitest";
import { formatMoney } from "./formatMoney.js";

describe("TC-UNIT-I18N-001 formatMoney es-MX", () => {
  it("formats MXN for Mexico locale", () => {
    const r = formatMoney({
      locale: "es-MX",
      currency: "MXN",
      amount: 1234.5,
    });
    expect(r.amount).toBe(1234.5);
    expect(r.currency).toBe("MXN");
    expect(r.formatted).toMatch(/1.?234/);
    expect(r.formatted).toMatch(/MXN|\$/);
  });
});

describe("TC-UNIT-I18N-002 locale vs currency", () => {
  it("zh-CN locale with MXN currency", () => {
    const r = formatMoney({
      locale: "zh-CN",
      currency: "MXN",
      amount: 100,
    });
    expect(r.formatted).toContain("100");
    expect(r.currency).toBe("MXN");
  });
});
