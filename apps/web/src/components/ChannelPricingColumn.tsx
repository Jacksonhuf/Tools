import type { Channel } from "../api/client";
import { WaterfallChart } from "./WaterfallChart";

export interface ChannelSimulation {
  publish_price_mxn: number;
  publish_price: { formatted: string };
  waterfall: Array<{ layer_id: string; amount_mxn: number }>;
  guards: string[];
}

interface PricingContextSlice {
  versions: {
    active?: {
      publish_price?: { formatted: string };
    } | null;
  };
  floors: {
    mercado_libre: { formatted: string; amount_mxn: number };
    amazon_mx: { formatted: string; amount_mxn: number };
  };
}

interface Props {
  channel: Channel;
  title: string;
  context: PricingContextSlice;
  simulation: ChannelSimulation | null;
  formatAmount: (n: number) => string;
  onPublish: () => void;
  publishLabel: string;
  syncToChannelLabel: string;
  onSyncToChannel?: () => void;
  activeLabel: string;
  floorLabel: string;
  guardsLabel: string;
  noGuardsLabel: string;
  layerLabels?: Record<string, string>;
}

export function ChannelPricingColumn({
  channel,
  title,
  context,
  simulation,
  formatAmount,
  onPublish,
  publishLabel,
  syncToChannelLabel,
  onSyncToChannel,
  activeLabel,
  floorLabel,
  guardsLabel,
  noGuardsLabel,
  layerLabels,
}: Props) {
  const floor =
    channel === "MERCADO_LIBRE"
      ? context.floors.mercado_libre
      : context.floors.amazon_mx;

  return (
    <div className="channel-column" data-channel={channel}>
      <h2>{title}</h2>
      <p>
        {activeLabel}:{" "}
        {context.versions.active?.publish_price?.formatted ?? "—"}
      </p>
      {context.versions.active && onSyncToChannel && (
        <button type="button" onClick={onSyncToChannel}>
          {syncToChannelLabel}
        </button>
      )}
      <p>
        {floorLabel}: {floor.formatted}
      </p>
      {simulation && (
        <>
          <p className="highlight">{simulation.publish_price.formatted}</p>
          <WaterfallChart
            rows={simulation.waterfall}
            formatAmount={formatAmount}
            layerLabels={layerLabels}
          />
          <h3>{guardsLabel}</h3>
          {simulation.guards.length === 0 ? (
            <p>{noGuardsLabel}</p>
          ) : (
            <ul>
              {simulation.guards.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          <button type="button" className="primary" onClick={onPublish}>
            {publishLabel}
          </button>
        </>
      )}
    </div>
  );
}
