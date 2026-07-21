import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  aggregateAnchor,
  applyOffset,
  assertWithinTolerance,
  computeCompetitive,
  computeCostForward,
  computeCostReverse,
  computeFloorPrice,
  computeLandedCost,
  roundPrice,
} from "@mx-pricing/pricing-engine";

const goldenDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "golden"
);

interface GoldenFixture {
  golden_id: string;
  engine: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

function loadFixtures(): GoldenFixture[] {
  const manifest = JSON.parse(
    readFileSync(join(goldenDir, "manifest.json"), "utf-8")
  ) as { fixtures: string[] };
  return manifest.fixtures.map((file) => {
    const raw = readFileSync(join(goldenDir, file), "utf-8");
    return JSON.parse(raw) as GoldenFixture;
  });
}

function numClose(
  actual: number,
  expected: number,
  tolerance?: number
): void {
  const tol = tolerance ?? 0;
  expect(assertWithinTolerance(actual, expected, tol)).toBe(true);
}

describe("golden fixtures (ci-unit-engine)", () => {
  for (const fx of loadFixtures()) {
    it(fx.golden_id, () => {
      const tol = (fx.expected.tolerance as number | undefined) ?? 0;
      switch (fx.engine) {
        case "landed_cost": {
          const result = computeLandedCost(
            fx.input as Parameters<typeof computeLandedCost>[0]
          );
          for (const [key, val] of Object.entries(fx.expected)) {
            if (key === "tolerance") continue;
            numClose(
              result[key as keyof typeof result] as number,
              val as number,
              tol
            );
          }
          break;
        }
        case "cost_forward": {
          const result = computeCostForward(
            fx.input as Parameters<typeof computeCostForward>[0]
          );
          numClose(result.publish_price_mxn, fx.expected.publish_price_mxn as number, tol);
          const layers = fx.expected.layers as
            | Record<string, { amount_mxn: number }>
            | undefined;
          if (layers && result.layers) {
            for (const [layerId, exp] of Object.entries(layers)) {
              expect(result.layers[layerId]?.amount_mxn).toBe(exp.amount_mxn);
            }
          }
          break;
        }
        case "cost_reverse": {
          const result = computeCostReverse(
            fx.input as Parameters<typeof computeCostReverse>[0]
          );
          numClose(result.implied_margin_pct, fx.expected.implied_margin_pct as number, tol);
          break;
        }
        case "round_price": {
          const input = fx.input as {
            raw_price_mxn: number;
            rounding_rule: Parameters<typeof roundPrice>[1];
          };
          const publish = roundPrice(input.raw_price_mxn, input.rounding_rule);
          expect(publish).toBe(fx.expected.publish_price_mxn);
          break;
        }
        case "apply_offset": {
          const input = fx.input as {
            anchor_price_mxn: number;
            offset: Parameters<typeof applyOffset>[1];
          };
          const match = applyOffset(input.anchor_price_mxn, input.offset);
          expect(match).toBe(fx.expected.match_price_mxn);
          break;
        }
        case "aggregate_anchor": {
          const input = fx.input as {
            anchor_type: string;
            observations_mxn: number[];
          };
          const anchor = aggregateAnchor(
            input.anchor_type,
            input.observations_mxn
          );
          expect(anchor).toBe(fx.expected.anchor_price_mxn);
          break;
        }
        case "competitive": {
          const result = computeCompetitive(
            fx.input as Parameters<typeof computeCompetitive>[0]
          );
          if (fx.expected.publish_price_mxn !== undefined) {
            numClose(
              result.publish_price_mxn,
              fx.expected.publish_price_mxn as number,
              tol
            );
          }
          if (fx.expected.floor_binding_applied !== undefined) {
            expect(result.floor_binding_applied).toBe(
              fx.expected.floor_binding_applied
            );
          }
          if (fx.expected.anchor_price_mxn !== undefined) {
            expect(result.anchor_price_mxn).toBe(fx.expected.anchor_price_mxn);
          }
          if (fx.expected.ignored_channels) {
            expect(result.ignored_channels).toEqual(
              fx.expected.ignored_channels
            );
          }
          const expLayers = fx.expected.layers as
            | Record<string, { reason?: string; lift_mxn?: number }>
            | undefined;
          if (expLayers?.FLOOR_BINDING) {
            expect(result.layers?.FLOOR_BINDING?.reason).toBe(
              expLayers.FLOOR_BINDING.reason
            );
            if (expLayers.FLOOR_BINDING.lift_mxn !== undefined) {
              expect(result.layers?.FLOOR_BINDING?.lift_mxn).toBe(
                expLayers.FLOOR_BINDING.lift_mxn
              );
            }
          }
          break;
        }
        case "floor": {
          const input = fx.input as Record<string, unknown>;
          if (input.channels) {
            const channels = input.channels as Record<
              string,
              Parameters<typeof computeFloorPrice>[2]
            >;
            const landed = input.landed_cost_mxn as number;
            const minMargin = input.min_margin_pct as number;
            const ml = computeFloorPrice(
              landed,
              minMargin,
              channels.MERCADO_LIBRE
            );
            const amz = computeFloorPrice(
              landed,
              minMargin,
              channels.AMAZON_MX
            );
            numClose(ml, fx.expected.floor_mercado_libre_mxn as number, tol);
            numClose(amz, fx.expected.floor_amazon_mx_mxn as number, tol);
            expect(ml).toBeGreaterThan(amz);
          } else if (input.fee_template_variants) {
            const variants = input.fee_template_variants as Array<
              Parameters<typeof computeFloorPrice>[2] & { label: string }
            >;
            const landed = input.landed_cost_mxn as number;
            const minMargin = input.min_margin_pct as number;
            const floors = variants.map((v) =>
              computeFloorPrice(landed, minMargin, v)
            );
            numClose(floors[0], fx.expected.floor_fba_low_mxn as number, tol);
            numClose(floors[1], fx.expected.floor_fba_high_mxn as number, tol);
            expect(floors[1]).toBeGreaterThan(floors[0]);
          }
          break;
        }
        default:
          throw new Error(`Unknown engine: ${fx.engine}`);
      }
    });
  }
});

describe("TC-UNIT-COST-007 guard", () => {
  it("BELOW_MIN_MARGIN when target price too low", async () => {
    const { checkMinMargin } = await import("@mx-pricing/pricing-engine");
    const code = checkMinMargin({
      landed_cost_mxn: 1000,
      publish_price_mxn: 1200,
      min_margin_pct: 10,
      fee_template: {
        commission_pct_of_price: 15,
        payment_pct_of_price: 0,
        fulfillment_fixed_mxn: 0,
      },
      tax_strategy: "PRICE_EXCLUDES_IVA",
      iva_rate: 0,
    });
    expect(code).toBe("BELOW_MIN_MARGIN");
  });
});
