import type { getFeatureFlags } from "./feature-flags.js";

type FeatureFlagsSnapshot = ReturnType<typeof getFeatureFlags>;

function cell(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function featureFlagsToCsv(
  flags: FeatureFlagsSnapshot,
  exportedAt: string
): string {
  const lines = [
    "exported_at,agent_copilot,channel_sandbox_ledger,repricing_auto_pending,digest_dispatch,buy_box_anchor,repricing_batch_worker,channel_live_publish,flags_generated_at",
  ];
  lines.push(
    [
      exportedAt,
      flags.agent_copilot ? "true" : "false",
      flags.channel_sandbox_ledger ? "true" : "false",
      flags.repricing_auto_pending ? "true" : "false",
      flags.digest_dispatch ? "true" : "false",
      flags.buy_box_anchor ? "true" : "false",
      flags.repricing_batch_worker ? "true" : "false",
      flags.channel_live_publish ? "true" : "false",
      cell(flags.generated_at),
    ].join(",")
  );
  return `${lines.join("\n")}\n`;
}
