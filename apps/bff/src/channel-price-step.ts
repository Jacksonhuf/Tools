import type { SalesChannel } from "@mx-pricing/channel-adapters";

/** Whole-peso step for Amazon MX mock (TC-INT-CH-005). */
export function normalizePriceForChannel(
  channel: SalesChannel,
  price_mxn: number
): number {
  if (channel === "AMAZON_MX") {
    return Math.round(price_mxn);
  }
  return Math.round(price_mxn * 100) / 100;
}
