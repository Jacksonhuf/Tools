import type { Channel } from "../api/client";
import { WaterfallChart } from "./WaterfallChart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="space-y-4" data-channel={channel}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between border-b py-2">
          <span className="text-muted-foreground">{activeLabel}</span>
          <span className="font-medium tabular-nums">
            {context.versions.active?.publish_price?.formatted ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between border-b py-2">
          <span className="text-muted-foreground">{floorLabel}</span>
          <span className="font-medium tabular-nums">{floor.formatted}</span>
        </div>
      </div>
      {context.versions.active && onSyncToChannel && (
        <Button variant="outline" size="sm" onClick={onSyncToChannel}>
          {syncToChannelLabel}
        </Button>
      )}
      {simulation && (
        <>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-primary">
            {simulation.publish_price.formatted}
          </p>
          <WaterfallChart
            rows={simulation.waterfall}
            formatAmount={formatAmount}
            layerLabels={layerLabels}
          />
          <Separator />
          <h3 className="text-sm font-semibold">{guardsLabel}</h3>
          {simulation.guards.length === 0 ? (
            <p className="text-sm text-muted-foreground">{noGuardsLabel}</p>
          ) : (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {simulation.guards.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          <Button className="w-full sm:w-auto" onClick={onPublish}>
            {publishLabel}
          </Button>
        </>
      )}
    </div>
  );
}
