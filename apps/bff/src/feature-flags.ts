export function getFeatureFlags() {
  const envOff = (name: string) =>
    process.env[name]?.trim().toLowerCase() === "0" ||
    process.env[name]?.trim().toLowerCase() === "false";

  return {
    agent_copilot: !envOff("FEATURE_AGENT_COPILOT"),
    channel_sandbox_ledger: !envOff("FEATURE_CHANNEL_SANDBOX"),
    repricing_auto_pending: !envOff("FEATURE_REPRICING_AUTO_PENDING"),
    digest_dispatch: !envOff("FEATURE_DIGEST_DISPATCH"),
    generated_at: new Date().toISOString(),
  };
}
