import { roundPrice } from "./floor.js";
import type { Channel, Offset, RoundingRule } from "./types.js";

export function aggregateAnchor(
  anchor_type: string,
  observations_mxn: number[]
): number {
  if (observations_mxn.length === 0) {
    throw new Error("NO_OBSERVATIONS");
  }
  const sorted = [...observations_mxn].sort((a, b) => a - b);
  if (anchor_type === "min") {
    return sorted[0];
  }
  if (anchor_type === "max") {
    return sorted[sorted.length - 1];
  }
  if (anchor_type === "median") {
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
  throw new Error(`UNKNOWN_ANCHOR_TYPE:${anchor_type}`);
}

export function applyOffset(anchor_price_mxn: number, offset: Offset): number {
  if (offset.type === "PERCENT") {
    return anchor_price_mxn * (1 + offset.value / 100);
  }
  return anchor_price_mxn + offset.value;
}

export interface CompetitorObservation {
  channel: Channel;
  effective_price_mxn: number;
}

export interface CompetitiveInput {
  pricing_mode: string;
  channel?: Channel;
  match_price_mxn?: number;
  floor_price_mxn: number;
  rounding_rule: RoundingRule;
  anchor_type?: string;
  competitor_observations?: CompetitorObservation[];
  offset?: Offset;
}

export interface CompetitiveResult {
  publish_price_mxn: number;
  floor_binding_applied: boolean;
  anchor_price_mxn?: number;
  ignored_channels?: Channel[];
  layers?: Record<string, { reason?: string; lift_mxn?: number }>;
}

/** SDD §6.5 */
export function computeCompetitive(input: CompetitiveInput): CompetitiveResult {
  const {
    channel,
    match_price_mxn: explicitMatch,
    floor_price_mxn,
    rounding_rule,
    anchor_type,
    competitor_observations,
    offset,
  } = input;

  let match = explicitMatch;
  let anchor_price_mxn: number | undefined;
  const ignored_channels: Channel[] = [];

  if (
    competitor_observations &&
    anchor_type &&
    channel !== undefined
  ) {
    const filtered = competitor_observations.filter((o) => {
      if (o.channel !== channel) {
        if (!ignored_channels.includes(o.channel)) {
          ignored_channels.push(o.channel);
        }
        return false;
      }
      return true;
    });
    anchor_price_mxn = aggregateAnchor(
      anchor_type,
      filtered.map((o) => o.effective_price_mxn)
    );
    const off = offset ?? { type: "PERCENT", value: 0 };
    match = applyOffset(anchor_price_mxn, off);
  }

  if (match === undefined) {
    throw new Error("MATCH_PRICE_REQUIRED");
  }

  const raw = Math.max(match, floor_price_mxn);
  const floor_binding_applied = match < floor_price_mxn;
  const publish_price_mxn = roundPrice(raw, rounding_rule);

  const result: CompetitiveResult = {
    publish_price_mxn,
    floor_binding_applied,
  };
  if (anchor_price_mxn !== undefined) {
    result.anchor_price_mxn = anchor_price_mxn;
  }
  if (ignored_channels.length > 0) {
    result.ignored_channels = ignored_channels;
  }
  if (floor_binding_applied) {
    result.layers = {
      FLOOR_BINDING: {
        reason: "FLOOR_LIFT",
        lift_mxn: floor_price_mxn - match,
      },
    };
  }
  return result;
}
