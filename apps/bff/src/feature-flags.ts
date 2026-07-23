export function getFeatureFlags() {
  const envOff = (name: string) =>
    process.env[name]?.trim().toLowerCase() === "0" ||
    process.env[name]?.trim().toLowerCase() === "false";

  const envOn = (name: string) =>
    process.env[name]?.trim().toLowerCase() === "1" ||
    process.env[name]?.trim().toLowerCase() === "true";

  return {
    agent_copilot: !envOff("FEATURE_AGENT_COPILOT"),
    channel_sandbox_ledger: !envOff("FEATURE_CHANNEL_SANDBOX"),
    repricing_auto_pending: !envOff("FEATURE_REPRICING_AUTO_PENDING"),
    digest_dispatch: !envOff("FEATURE_DIGEST_DISPATCH"),
    buy_box_anchor: !envOff("FEATURE_BUY_BOX_ANCHOR"),
    repricing_batch_worker: !envOff("FEATURE_REPRICING_BATCH_WORKER"),
    channel_live_publish:
      envOn("CHANNEL_LIVE_ACKNOWLEDGED") && !envOff("FEATURE_CHANNEL_LIVE_PUBLISH"),
    generated_at: new Date().toISOString(),
  };
}

export type FeatureFlagKey = Exclude<
  keyof ReturnType<typeof getFeatureFlags>,
  "generated_at"
>;

const FLAG_KEYS: FeatureFlagKey[] = [
  "agent_copilot",
  "channel_sandbox_ledger",
  "repricing_auto_pending",
  "digest_dispatch",
  "buy_box_anchor",
  "repricing_batch_worker",
  "channel_live_publish",
];

export function getFeatureFlagValue(
  flagKey: string
): { key: FeatureFlagKey; enabled: boolean } | undefined {
  if (!FLAG_KEYS.includes(flagKey as FeatureFlagKey)) {
    return undefined;
  }
  const flags = getFeatureFlags();
  const key = flagKey as FeatureFlagKey;
  return { key, enabled: flags[key] };
}
