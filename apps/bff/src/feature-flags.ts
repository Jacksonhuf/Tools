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
