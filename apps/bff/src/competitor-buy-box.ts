import type { PriceObservationRecord } from "./repositories/competitor-types.js";

export function observationBuyBoxWinner(
  observation: PriceObservationRecord | undefined
): boolean {
  if (!observation?.raw_json) return false;
  return observation.raw_json.buy_box_winner === true;
}

export function buildObservationRawJson(input: {
  source?: string;
  buy_box_winner?: boolean;
}): Record<string, unknown> | undefined {
  const raw: Record<string, unknown> = {};
  if (input.source?.trim()) raw.source = input.source.trim();
  if (input.buy_box_winner === true) raw.buy_box_winner = true;
  return Object.keys(raw).length > 0 ? raw : undefined;
}
