import type { RepricingAction } from "../repositories/dynamic-rule-types.js";
import type { VersionState } from "../version-store.js";

/** PRD: suggest | auto_pending | auto_active (legacy `pending` = auto_pending). */
export function versionStateForAction(action: RepricingAction): VersionState {
  if (action === "auto_active") {
    return "active";
  }
  if (action === "pending" || action === "auto_pending") {
    return "pending";
  }
  return "suggested";
}

export function isAutoPendingAction(action: RepricingAction): boolean {
  return action === "pending" || action === "auto_pending";
}
