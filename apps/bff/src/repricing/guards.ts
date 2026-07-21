import type { GuardCode } from "@mx-pricing/pricing-engine";
import type { DynamicRuleRecord } from "../repositories/dynamic-rule-types.js";
import type { RepricingActivityRepository } from "../repositories/repricing-activity-types.js";

export async function checkDynamicRepricingGuards(
  activity: RepricingActivityRepository,
  listingId: string,
  rule: DynamicRuleRecord
): Promise<GuardCode | null> {
  if (rule.cooldown_min > 0) {
    const last = await activity.lastApplyAt(listingId);
    if (last) {
      const elapsedMs = Date.now() - new Date(last).getTime();
      if (elapsedMs < rule.cooldown_min * 60 * 1000) {
        return "COOLDOWN_ACTIVE";
      }
    }
  }
  if (rule.daily_limit > 0) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const count = await activity.countAppliesSince(listingId, startOfDay);
    if (count >= rule.daily_limit) {
      return "DAILY_LIMIT_EXCEEDED";
    }
  }
  return null;
}
