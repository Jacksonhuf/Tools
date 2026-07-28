import type { SalesChannel } from "@mx-pricing/channel-adapters";

export type StoredPublishOutcome =
  | {
      publish_status: "published";
      channel_price_mxn: number;
      version_id: string;
      retried?: boolean;
      channel: SalesChannel;
    }
  | { publish_status: "failed"; error_code: string; rule_frozen?: boolean };
