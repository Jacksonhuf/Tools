export type ChannelSandboxEventType =
  | "channel_publish"
  | "channel_publish_batch"
  | "listing_pull";

export interface ChannelSandboxEvent {
  id: string;
  tenant_id: string;
  listing_id: string;
  channel: string;
  event_type: ChannelSandboxEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

const events: ChannelSandboxEvent[] = [];
let seq = 0;

export function isChannelSandboxEnabled(): boolean {
  const raw = process.env.CHANNEL_SANDBOX_MODE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function getChannelSandboxStatus() {
  const enabled = isChannelSandboxEnabled();
  return {
    enabled,
    mode: enabled ? "sandbox" : "production",
    note: enabled
      ? "Channel writes are mocked; events recorded locally (no live ML/Amazon)."
      : "Sandbox disabled — adapters may call real channel APIs when configured.",
    allowed_operations: [
      "oauth_mock",
      "pull_listing_mock",
      "publish_price_mock",
      "reconcile_mock",
    ],
  };
}

export function recordChannelSandboxEvent(input: {
  tenant_id: string;
  listing_id: string;
  channel: string;
  event_type: ChannelSandboxEventType;
  payload: Record<string, unknown>;
}): ChannelSandboxEvent {
  seq += 1;
  const ev: ChannelSandboxEvent = {
    id: `sandbox-${seq}`,
    tenant_id: input.tenant_id,
    listing_id: input.listing_id,
    channel: input.channel,
    event_type: input.event_type,
    payload: input.payload,
    created_at: new Date().toISOString(),
  };
  events.push(ev);
  if (events.length > 500) {
    events.splice(0, events.length - 500);
  }
  return ev;
}

export function listChannelSandboxEvents(
  tenantId: string,
  limit = 50
): ChannelSandboxEvent[] {
  return events
    .filter((e) => e.tenant_id === tenantId)
    .slice(-limit)
    .reverse();
}

export function countChannelSandboxEvents(tenantId?: string): number {
  if (!tenantId) return events.length;
  return events.filter((e) => e.tenant_id === tenantId).length;
}

export function resetChannelSandboxForTests(): void {
  events.length = 0;
  seq = 0;
}
