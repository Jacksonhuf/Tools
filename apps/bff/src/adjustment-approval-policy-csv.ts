import type { getAdjustmentApprovalPolicy } from "./adjustment-approval-policy.js";

type AdjustmentApprovalPolicy = ReturnType<typeof getAdjustmentApprovalPolicy>;

export function adjustmentApprovalPolicyToCsv(
  policy: AdjustmentApprovalPolicy,
  exportedAt: string
): string {
  const lines = [
    "exported_at,max_drop_pct_without_approval,require_approval_below_target_margin",
  ];
  lines.push(
    [
      exportedAt,
      policy.max_drop_pct_without_approval,
      policy.require_approval_below_target_margin ? "true" : "false",
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
