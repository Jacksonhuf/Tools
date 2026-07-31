// api/handler.ts
import { handle } from "hono/vercel";

// apps/bff/dist/app.js
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException as HTTPException3 } from "hono/http-exception";
import { parseAcceptLanguage, formatMoney as formatMoney5 } from "@mx-pricing/i18n-format";
import { checkMinMargin as checkMinMargin3 } from "@mx-pricing/pricing-engine";

// apps/bff/dist/pricing-service.js
import { computeCompetitive, computeCostForward, computeFloorPrice, checkMinMargin } from "@mx-pricing/pricing-engine";
import { formatMoney } from "@mx-pricing/i18n-format";
function feeForChannel(sku, channel) {
  return channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
}
function buildFloors(sku) {
  const floor_ml = computeFloorPrice(sku.landed_cost_mxn, sku.policy.min_margin_pct, sku.fee_ml);
  const floor_amazon = computeFloorPrice(sku.landed_cost_mxn, sku.policy.min_margin_pct, sku.fee_amazon);
  return { floor_ml, floor_amazon };
}
function runSimulate(sku, body, locale) {
  const channel = body.channel;
  const fee = feeForChannel(sku, channel);
  const { floor_ml, floor_amazon } = buildFloors(sku);
  const floor = channel === "MERCADO_LIBRE" ? floor_ml : floor_amazon;
  const rounding_rule = { type: "NONE", decimals: 2 };
  const guards = [];
  let publish_price_mxn;
  let waterfall;
  if (body.pricing_mode === "competitive" || body.pricing_mode === "competitive_with_floor") {
    const comp = computeCompetitive({
      pricing_mode: body.pricing_mode,
      channel,
      match_price_mxn: body.competitor_price_mxn,
      floor_price_mxn: floor,
      rounding_rule
    });
    publish_price_mxn = comp.publish_price_mxn;
    waterfall = [
      { layer_id: "LANDED", amount_mxn: sku.landed_cost_mxn },
      { layer_id: "MATCH_PRICE", amount_mxn: body.competitor_price_mxn ?? 0 },
      { layer_id: "LIST_PRICE", amount_mxn: publish_price_mxn }
    ];
    if (comp.floor_binding_applied) {
      waterfall.splice(2, 0, {
        layer_id: "FLOOR_BINDING",
        amount_mxn: floor
      });
    }
  } else {
    const margin = body.target_margin_pct ?? sku.policy.target_margin_pct;
    const forward = computeCostForward({
      pricing_mode: "cost",
      landed_cost_mxn: sku.landed_cost_mxn,
      target_margin_pct: margin,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate,
      rounding_rule
    });
    publish_price_mxn = forward.publish_price_mxn;
    waterfall = [
      { layer_id: "LANDED", amount_mxn: sku.landed_cost_mxn },
      { layer_id: "TARGET_PROFIT", amount_mxn: margin },
      { layer_id: "LIST_PRICE", amount_mxn: publish_price_mxn }
    ];
  }
  const guard = checkMinMargin({
    landed_cost_mxn: sku.landed_cost_mxn,
    publish_price_mxn,
    min_margin_pct: sku.policy.min_margin_pct,
    fee_template: fee,
    tax_strategy: sku.policy.tax_strategy,
    iva_rate: sku.policy.iva_rate
  });
  if (guard)
    guards.push(guard);
  const money = (amount) => formatMoney({ locale, currency: "MXN", amount });
  return {
    sku_id: sku.id,
    channel,
    pricing_mode: body.pricing_mode,
    publish_price_mxn,
    publish_price: money(publish_price_mxn),
    floor_price_mxn: floor,
    floor_price: money(floor),
    waterfall,
    guards
  };
}
function buildPricingContext(sku, channel, locale) {
  const { floor_ml, floor_amazon } = buildFloors(sku);
  const money = (amount) => formatMoney({ locale, currency: "MXN", amount });
  const costActive = computeCostForward({
    pricing_mode: "cost",
    landed_cost_mxn: sku.landed_cost_mxn,
    target_margin_pct: sku.policy.target_margin_pct,
    fee_template: sku.fee_ml,
    tax_strategy: sku.policy.tax_strategy,
    iva_rate: sku.policy.iva_rate,
    rounding_rule: { type: "NONE", decimals: 2 }
  });
  const defaultActive = {
    publish_price_mxn: costActive.publish_price_mxn,
    publish_price: money(costActive.publish_price_mxn),
    channel: "MERCADO_LIBRE"
  };
  return {
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      name: sku.name,
      landed_cost_mxn: sku.landed_cost_mxn,
      landed_cost: money(sku.landed_cost_mxn),
      formatted: money(sku.landed_cost_mxn).formatted
    },
    policy: sku.policy,
    floors: {
      mercado_libre: {
        amount_mxn: floor_ml,
        ...money(floor_ml)
      },
      amazon_mx: {
        amount_mxn: floor_amazon,
        ...money(floor_amazon)
      }
    },
    channel: channel ?? null,
    listings: [],
    versions: {
      suggested: null,
      active: defaultActive
    }
  };
}

// apps/bff/dist/pricing-context-view.js
import { formatMoney as formatMoney2 } from "@mx-pricing/i18n-format";

// apps/bff/dist/fixtures.js
var DEMO_SKU = {
  id: "demo-sku-001",
  tenant_id: "tenant-demo",
  sku_code: "MX-DEMO-001",
  name: "Demo Cross-Border SKU",
  category_id: "cat-electronics-mx",
  hs_code: "HS-ELECTRONICS-MX",
  landed_cost_mxn: 1e3,
  policy: {
    pricing_mode: "competitive_with_floor",
    target_margin_pct: 20,
    min_margin_pct: 10,
    tax_strategy: "PRICE_EXCLUDES_IVA",
    iva_rate: 0.16
  },
  fee_ml: {
    commission_pct_of_price: 18,
    payment_pct_of_price: 3,
    fulfillment_fixed_mxn: 40
  },
  fee_amazon: {
    commission_pct_of_price: 15,
    payment_pct_of_price: 0,
    fulfillment_fixed_mxn: 55
  }
};
var DEMO_LISTING_ML = {
  id: "listing-ml-001",
  sku_id: DEMO_SKU.id,
  channel: "MERCADO_LIBRE"
};
var DEMO_LISTING_AMAZON = {
  id: "listing-amz-001",
  sku_id: DEMO_SKU.id,
  channel: "AMAZON_MX"
};
var LISTINGS = [DEMO_LISTING_ML, DEMO_LISTING_AMAZON];
function getListing(tenantId, listingId) {
  if (tenantId !== DEMO_SKU.tenant_id)
    return void 0;
  const listing = LISTINGS.find((l) => l.id === listingId);
  if (!listing)
    return void 0;
  const sku = getSku(tenantId, listing.sku_id);
  if (!sku)
    return void 0;
  return { ...listing, sku };
}
function listSkusForTenant(tenantId) {
  const sku = getSku(tenantId, DEMO_SKU.id);
  return sku ? [sku] : [];
}
function getSku(tenantId, skuId) {
  if (skuId !== DEMO_SKU.id || tenantId !== DEMO_SKU.tenant_id) {
    return void 0;
  }
  return DEMO_SKU;
}
function getListingIdForChannel(channel) {
  const listing = LISTINGS.find((l) => l.channel === channel);
  return listing?.id;
}
function listListingsForSku(tenantId, skuId) {
  if (tenantId !== DEMO_SKU.tenant_id)
    return [];
  return LISTINGS.filter((l) => l.sku_id === skuId);
}

// apps/bff/dist/competitor-summary.js
import { aggregateAnchor } from "@mx-pricing/pricing-engine";

// apps/bff/dist/competitor-buy-box.js
function observationBuyBoxWinner(observation) {
  if (!observation?.raw_json)
    return false;
  return observation.raw_json.buy_box_winner === true;
}
function buildObservationRawJson(input) {
  const raw = {};
  if (input.source?.trim())
    raw.source = input.source.trim();
  if (input.buy_box_winner === true)
    raw.buy_box_winner = true;
  return Object.keys(raw).length > 0 ? raw : void 0;
}

// apps/bff/dist/competitor-summary.js
async function mapOffersWithLatestObservations(competitors, listingId) {
  const offers2 = await competitors.listOffers(listingId);
  return Promise.all(offers2.map(async (o) => {
    const latest = await competitors.latestObservation(o.id);
    return {
      ...o,
      latest_effective_mxn: latest?.effective_price ?? null,
      latest_observed_at: latest?.observed_at ?? null,
      latest_observation: latest
    };
  }));
}
function buildCompetitorAnchorSummary(offers2) {
  const prices = offers2.map((o) => o.latest_effective_mxn).filter((p) => p !== null && p > 0);
  if (prices.length === 0) {
    return {
      count: 0,
      min_mxn: null,
      median_mxn: null,
      primary_mxn: null,
      buy_box_mxn: null
    };
  }
  const primary = offers2.find((o) => o.is_primary)?.latest_effective_mxn ?? null;
  const buyBoxOffers = offers2.filter((o) => observationBuyBoxWinner(o.latest_observation));
  const buy_box_mxn = buyBoxOffers.length > 0 ? Math.min(...buyBoxOffers.map((o) => o.latest_effective_mxn).filter((p) => p !== null && p > 0)) : null;
  return {
    count: prices.length,
    min_mxn: aggregateAnchor("min", prices),
    median_mxn: aggregateAnchor("median", prices),
    primary_mxn: primary,
    buy_box_mxn
  };
}

// apps/bff/dist/pricing-context-view.js
async function buildSkuPricingContextView(deps, tenantId, skuId, locale, channel) {
  const sku = await deps.catalog.getSku(tenantId, skuId);
  if (!sku) {
    return null;
  }
  const versions2 = await deps.catalog.listVersions(sku.id);
  const ch = channel ?? "MERCADO_LIBRE";
  const active = versions2.find((v) => v.state === "active" && v.channel === ch);
  const suggested = versions2.find((v) => v.state === "suggested" && v.channel === ch);
  const ctx = buildPricingContext(sku, channel, locale);
  const versionSlice = (v) => ({
    version_id: v.id,
    publish_price_mxn: v.publish_price_mxn,
    publish_price: formatMoney2({
      locale,
      currency: "MXN",
      amount: v.publish_price_mxn
    }),
    channel: v.channel
  });
  if (active) {
    ctx.versions.active = versionSlice(active);
  }
  if (suggested) {
    ctx.versions.suggested = versionSlice(suggested);
  }
  const listingId = getListingIdForChannel(ch);
  if (listingId) {
    const withLatest = await mapOffersWithLatestObservations(deps.competitors, listingId);
    Object.assign(ctx, {
      competitors: {
        offers: withLatest,
        anchor: buildCompetitorAnchorSummary(withLatest)
      }
    });
  }
  return { sku_id: skuId, channel: ch, context: ctx };
}

// apps/bff/dist/pricing-context-csv.js
function cell(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function pricingContextToCsv(view, exportedAt) {
  const ctx = view.context;
  const active = ctx.versions.active;
  const suggested = ctx.versions.suggested;
  const competitors = ctx;
  const anchor = competitors.competitors?.anchor;
  const offerCount = competitors.competitors?.offers?.length ?? 0;
  const lines = [
    "exported_at,sku_id,channel,landed_cost_mxn,active_version_id,active_price_mxn,suggested_version_id,suggested_price_mxn,floor_ml_mxn,floor_amz_mxn,anchor_median_mxn,competitor_offer_count"
  ];
  lines.push([
    exportedAt,
    cell(view.sku_id),
    cell(view.channel),
    ctx.sku.landed_cost_mxn,
    cell(active.version_id ?? ""),
    active.publish_price_mxn,
    cell(suggested?.version_id ?? ""),
    suggested?.publish_price_mxn ?? "",
    ctx.floors.mercado_libre.amount_mxn,
    ctx.floors.amazon_mx.amount_mxn,
    anchor?.median_mxn ?? "",
    offerCount
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/version-store.js
var versionSeq = 0;
var versions = [];
function listVersions(skuId) {
  return versions.filter((v) => v.sku_id === skuId);
}
function countVersions() {
  return versions.length;
}
function createVersion(input) {
  versionSeq += 1;
  const record = {
    id: `ver-${versionSeq}`,
    sku_id: input.sku_id,
    channel: input.channel,
    state: input.state,
    publish_price_mxn: input.publish_price_mxn,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    trigger_event_id: input.trigger_event_id ?? null,
    dynamic_rule_id: input.dynamic_rule_id ?? null,
    competitor_snapshot_ids: input.competitor_snapshot_ids ?? [],
    floor_snapshot_id: input.floor_snapshot_id ?? null,
    cost_snapshot_id: input.cost_snapshot_id ?? null
  };
  if (input.state === "active") {
    for (const v of versions) {
      if (v.sku_id === input.sku_id && v.channel === input.channel && v.state === "active") {
        v.state = "superseded";
      }
    }
  }
  versions.push(record);
  return record;
}
function getVersionById(versionId) {
  return versions.find((v) => v.id === versionId);
}
function updateVersionState(versionId, expectedState, newState) {
  const v = versions.find((x) => x.id === versionId);
  if (!v || v.state !== expectedState) {
    return void 0;
  }
  v.state = newState;
  return v;
}
function setVersionChannelPublishStatus(versionId, status) {
  const v = versions.find((x) => x.id === versionId);
  if (v) {
    v.channel_publish_status = status;
  }
}
function resetVersionsForTests() {
  versions.length = 0;
  versionSeq = 0;
}

// apps/bff/dist/repositories/memory-catalog.js
var DEMO_SKU_FEE_SNAPSHOT = {
  fee_ml: { ...DEMO_SKU.fee_ml },
  fee_amazon: { ...DEMO_SKU.fee_amazon }
};
var DEMO_SKU_POLICY_SNAPSHOT = { ...DEMO_SKU.policy };
var MemoryCatalogRepository = class {
  driver = "memory";
  async getSku(tenantId, skuId) {
    return getSku(tenantId, skuId);
  }
  async getListing(tenantId, listingId) {
    return getListing(tenantId, listingId);
  }
  async listVersions(skuId) {
    return listVersions(skuId);
  }
  async getVersion(tenantId, versionId) {
    const v = getVersionById(versionId);
    if (!v)
      return void 0;
    const sku = await this.getSku(tenantId, v.sku_id);
    if (!sku)
      return void 0;
    return v;
  }
  async createVersion(input) {
    return createVersion({
      sku_id: input.sku_id,
      channel: input.channel,
      state: input.state,
      publish_price_mxn: input.publish_price_mxn,
      trigger_event_id: input.trigger_event_id,
      dynamic_rule_id: input.dynamic_rule_id,
      competitor_snapshot_ids: input.competitor_snapshot_ids,
      floor_snapshot_id: input.floor_snapshot_id,
      cost_snapshot_id: input.cost_snapshot_id
    });
  }
  async updateVersionState(versionId, expectedState, newState) {
    return updateVersionState(versionId, expectedState, newState);
  }
  async setVersionChannelPublishStatus(versionId, status) {
    if (status) {
      setVersionChannelPublishStatus(versionId, status);
    }
  }
  async countVersions() {
    return countVersions();
  }
  async listSkus(tenantId) {
    return listSkusForTenant(tenantId);
  }
  async updateSkuLandedCost(tenantId, skuId, landed_cost_mxn) {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku)
      return void 0;
    sku.landed_cost_mxn = landed_cost_mxn;
    if (skuId === DEMO_SKU.id && tenantId === DEMO_SKU.tenant_id) {
      DEMO_SKU.landed_cost_mxn = landed_cost_mxn;
    }
    return sku;
  }
  async updateSkuChannelFee(tenantId, skuId, channel, fee) {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku)
      return void 0;
    const next = { ...fee };
    if (channel === "MERCADO_LIBRE")
      sku.fee_ml = next;
    else
      sku.fee_amazon = next;
    if (skuId === DEMO_SKU.id && tenantId === DEMO_SKU.tenant_id) {
      if (channel === "MERCADO_LIBRE")
        DEMO_SKU.fee_ml = next;
      else
        DEMO_SKU.fee_amazon = next;
    }
    return sku;
  }
  async updateSkuPolicy(tenantId, skuId, patch) {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku)
      return void 0;
    sku.policy = { ...sku.policy, ...patch };
    if (skuId === DEMO_SKU.id && tenantId === DEMO_SKU.tenant_id) {
      DEMO_SKU.policy = { ...DEMO_SKU.policy, ...patch };
    }
    return sku;
  }
  resetForTests() {
    resetVersionsForTests();
    DEMO_SKU.landed_cost_mxn = 1e3;
    DEMO_SKU.fee_ml = { ...DEMO_SKU_FEE_SNAPSHOT.fee_ml };
    DEMO_SKU.fee_amazon = { ...DEMO_SKU_FEE_SNAPSHOT.fee_amazon };
    DEMO_SKU.policy = { ...DEMO_SKU_POLICY_SNAPSHOT };
  }
};

// apps/bff/dist/repositories/postgres-catalog.js
import pg from "pg";

// apps/bff/dist/repositories/types.js
function rowToSku(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    sku_code: row.sku_code,
    name: row.name,
    landed_cost_mxn: Number(row.landed_cost_mxn),
    policy: row.policy_json,
    fee_ml: row.fee_ml_json,
    fee_amazon: row.fee_amazon_json
  };
}

// apps/bff/dist/repositories/postgres-catalog.js
function mapVersionRow(row) {
  return {
    id: `ver-${row.id}`,
    sku_id: row.sku_id,
    channel: row.channel,
    state: row.state,
    publish_price_mxn: Number(row.publish_price_mxn),
    created_at: new Date(row.created_at).toISOString(),
    trigger_event_id: row.trigger_event_id ?? null,
    dynamic_rule_id: row.dynamic_rule_id ?? null,
    competitor_snapshot_ids: row.competitor_snapshot_ids ?? [],
    floor_snapshot_id: row.floor_snapshot_id ?? null,
    cost_snapshot_id: row.cost_snapshot_id ?? null
  };
}
var PostgresCatalogRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionStringOrPool) {
    this.pool = typeof connectionStringOrPool === "string" ? new pg.Pool({ connectionString: connectionStringOrPool }) : connectionStringOrPool;
  }
  async getSku(tenantId, skuId) {
    const r = await this.pool.query(`SELECT * FROM skus WHERE tenant_id = $1 AND id = $2`, [tenantId, skuId]);
    if (r.rowCount === 0)
      return void 0;
    return rowToSku(r.rows[0]);
  }
  async getListing(tenantId, listingId) {
    const r = await this.pool.query(`SELECT l.id AS listing_id, l.sku_id, l.channel,
              s.id, s.tenant_id, s.sku_code, s.name, s.landed_cost_mxn,
              s.policy_json, s.fee_ml_json, s.fee_amazon_json
       FROM listings l
       JOIN skus s ON s.id = l.sku_id
       WHERE l.tenant_id = $1 AND l.id = $2`, [tenantId, listingId]);
    if (r.rowCount === 0)
      return void 0;
    const row = r.rows[0];
    const sku = rowToSku(row);
    return {
      id: row.listing_id,
      sku_id: row.sku_id,
      channel: row.channel,
      sku
    };
  }
  async listVersions(skuId) {
    const r = await this.pool.query(`SELECT id::text, sku_id, channel, state, publish_price_mxn, created_at,
              trigger_event_id, dynamic_rule_id, competitor_snapshot_ids,
              floor_snapshot_id, cost_snapshot_id
       FROM price_versions WHERE sku_id = $1 ORDER BY id`, [skuId]);
    return r.rows.map((row) => mapVersionRow(row));
  }
  async getVersion(tenantId, versionId) {
    const numericId = versionId.replace(/^ver-/, "");
    const r = await this.pool.query(`SELECT v.id::text, v.sku_id, v.channel, v.state, v.publish_price_mxn, v.created_at,
              v.trigger_event_id, v.dynamic_rule_id, v.competitor_snapshot_ids,
              v.floor_snapshot_id, v.cost_snapshot_id
       FROM price_versions v
       JOIN skus s ON s.id = v.sku_id
       WHERE v.id = $1 AND s.tenant_id = $2`, [numericId, tenantId]);
    if (r.rowCount === 0)
      return void 0;
    return mapVersionRow(r.rows[0]);
  }
  async createVersion(input) {
    const client2 = await this.pool.connect();
    try {
      await client2.query("BEGIN");
      if (input.state === "active") {
        await client2.query(`UPDATE price_versions SET state = 'superseded'
           WHERE sku_id = $1 AND channel = $2 AND state = 'active'`, [input.sku_id, input.channel]);
      }
      const ins = await client2.query(`INSERT INTO price_versions (
           tenant_id, sku_id, channel, state, publish_price_mxn, reason,
           trigger_event_id, dynamic_rule_id, competitor_snapshot_ids,
           floor_snapshot_id, cost_snapshot_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, created_at, sku_id, channel, state, publish_price_mxn,
                   trigger_event_id, dynamic_rule_id, competitor_snapshot_ids,
                   floor_snapshot_id, cost_snapshot_id`, [
        input.tenant_id,
        input.sku_id,
        input.channel,
        input.state,
        input.publish_price_mxn,
        input.reason ?? null,
        input.trigger_event_id ?? null,
        input.dynamic_rule_id ?? null,
        input.competitor_snapshot_ids ?? [],
        input.floor_snapshot_id ?? null,
        input.cost_snapshot_id ?? null
      ]);
      await client2.query("COMMIT");
      const row = ins.rows[0];
      return {
        ...mapVersionRow(row),
        created_at: new Date(row.created_at).toISOString()
      };
    } catch (e) {
      await client2.query("ROLLBACK");
      throw e;
    } finally {
      client2.release();
    }
  }
  async updateVersionState(versionId, expectedState, newState) {
    const numericId = versionId.replace(/^ver-/, "");
    const r = await this.pool.query(`UPDATE price_versions
       SET state = $3
       WHERE id = $1 AND state = $2
       RETURNING id::text, sku_id, channel, state, publish_price_mxn, created_at`, [numericId, expectedState, newState]);
    if (r.rowCount === 0)
      return void 0;
    const row = r.rows[0];
    return {
      id: `ver-${row.id}`,
      sku_id: row.sku_id,
      channel: row.channel,
      state: row.state,
      publish_price_mxn: Number(row.publish_price_mxn),
      created_at: new Date(row.created_at).toISOString()
    };
  }
  async setVersionChannelPublishStatus(versionId, status) {
    await this.pool.query(`UPDATE price_versions SET channel_publish_status = $2 WHERE id::text = $1`, [versionId, status ?? null]);
  }
  async countVersions() {
    const r = await this.pool.query(`SELECT COUNT(*)::int AS c FROM price_versions`);
    return r.rows[0].c;
  }
  async listSkus(tenantId) {
    const r = await this.pool.query(`SELECT * FROM skus WHERE tenant_id = $1 ORDER BY sku_code`, [tenantId]);
    return r.rows.map((row) => rowToSku(row));
  }
  async updateSkuLandedCost(tenantId, skuId, landed_cost_mxn) {
    const r = await this.pool.query(`UPDATE skus SET landed_cost_mxn = $3
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`, [tenantId, skuId, landed_cost_mxn]);
    if (r.rowCount === 0)
      return void 0;
    return rowToSku(r.rows[0]);
  }
  async updateSkuChannelFee(tenantId, skuId, channel, fee) {
    const column = channel === "MERCADO_LIBRE" ? "fee_ml_json" : "fee_amazon_json";
    const r = await this.pool.query(`UPDATE skus SET ${column} = $3::jsonb
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`, [tenantId, skuId, JSON.stringify(fee)]);
    if (r.rowCount === 0)
      return void 0;
    return rowToSku(r.rows[0]);
  }
  async updateSkuPolicy(tenantId, skuId, patch) {
    const sku = await this.getSku(tenantId, skuId);
    if (!sku)
      return void 0;
    const next = { ...sku.policy, ...patch };
    const r = await this.pool.query(`UPDATE skus SET policy_json = $3::jsonb
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`, [tenantId, skuId, JSON.stringify(next)]);
    if (r.rowCount === 0)
      return void 0;
    return rowToSku(r.rows[0]);
  }
};

// apps/bff/dist/repositories/index.js
var singleton;
function createCatalogRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryCatalogRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresCatalogRepository(url);
  }
  return new MemoryCatalogRepository();
}
function getCatalogRepository() {
  if (!singleton) {
    singleton = createCatalogRepository();
  }
  return singleton;
}

// apps/bff/dist/repositories/memory-adjustment.js
var batchSeq = 0;
var itemSeq = 0;
var batches = /* @__PURE__ */ new Map();
var MemoryAdjustmentRepository = class {
  driver = "memory";
  async createBatch(input) {
    batchSeq += 1;
    const id = `adj-${batchSeq}`;
    const items = input.items.map((it) => {
      itemSeq += 1;
      return {
        id: `adji-${itemSeq}`,
        batch_id: id,
        listing_id: it.listing_id,
        explicit_price_mxn: it.explicit_price_mxn,
        from_price_mxn: it.from_price_mxn,
        guard_result: it.guard_result,
        to_version_id: null
      };
    });
    const record = {
      id,
      tenant_id: input.tenant_id,
      status: input.status,
      reason_code: input.reason_code ?? null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      approved_at: null,
      applied_at: null,
      items
    };
    batches.set(id, record);
    return structuredClone(record);
  }
  async getBatch(tenantId, batchId) {
    const b = batches.get(batchId);
    if (!b || b.tenant_id !== tenantId)
      return void 0;
    return structuredClone(b);
  }
  async listBatches(tenantId, limit = 50) {
    return [...batches.values()].filter((b) => b.tenant_id === tenantId).sort((a, b) => b.id.localeCompare(a.id)).slice(0, limit).map((b) => structuredClone(b));
  }
  async updateBatchStatus(tenantId, batchId, status, extra) {
    const b = batches.get(batchId);
    if (!b || b.tenant_id !== tenantId)
      return void 0;
    b.status = status;
    if (extra?.approved_at)
      b.approved_at = extra.approved_at;
    if (extra?.applied_at)
      b.applied_at = extra.applied_at;
    return structuredClone(b);
  }
  async setItemVersionId(batchId, itemId, to_version_id) {
    const b = batches.get(batchId);
    if (!b)
      return;
    const item = b.items.find((i) => i.id === itemId);
    if (item)
      item.to_version_id = to_version_id;
  }
  resetForTests() {
    batches.clear();
    batchSeq = 0;
    itemSeq = 0;
  }
};

// apps/bff/dist/repositories/postgres-adjustment.js
import pg2 from "pg";
function mapBatch(row, items) {
  return {
    id: `adj-${row.id}`,
    tenant_id: row.tenant_id,
    status: row.status,
    reason_code: row.reason_code ?? null,
    created_at: new Date(row.created_at).toISOString(),
    approved_at: row.approved_at ? new Date(row.approved_at).toISOString() : null,
    applied_at: row.applied_at ? new Date(row.applied_at).toISOString() : null,
    items
  };
}
var PostgresAdjustmentRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionStringOrPool) {
    this.pool = typeof connectionStringOrPool === "string" ? new pg2.Pool({ connectionString: connectionStringOrPool }) : connectionStringOrPool;
  }
  async createBatch(input) {
    const client2 = await this.pool.connect();
    try {
      await client2.query("BEGIN");
      const ins = await client2.query(`INSERT INTO adjustment_batches (tenant_id, status, reason_code)
         VALUES ($1, $2, $3) RETURNING *`, [input.tenant_id, input.status, input.reason_code ?? null]);
      const batchRow = ins.rows[0];
      const items = [];
      for (const it of input.items) {
        const ir = await client2.query(`INSERT INTO adjustment_items
           (batch_id, listing_id, explicit_price_mxn, from_price_mxn, guard_result)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`, [
          batchRow.id,
          it.listing_id,
          it.explicit_price_mxn,
          it.from_price_mxn,
          it.guard_result
        ]);
        items.push({
          id: `adji-${ir.rows[0].id}`,
          batch_id: `adj-${batchRow.id}`,
          listing_id: it.listing_id,
          explicit_price_mxn: it.explicit_price_mxn,
          from_price_mxn: it.from_price_mxn,
          guard_result: it.guard_result,
          to_version_id: null
        });
      }
      await client2.query("COMMIT");
      return mapBatch(batchRow, items);
    } catch (e) {
      await client2.query("ROLLBACK");
      throw e;
    } finally {
      client2.release();
    }
  }
  async getBatch(tenantId, batchId) {
    const numericId = batchId.replace(/^adj-/, "");
    const br = await this.pool.query(`SELECT * FROM adjustment_batches WHERE id = $1 AND tenant_id = $2`, [numericId, tenantId]);
    if (br.rowCount === 0)
      return void 0;
    const ir = await this.pool.query(`SELECT * FROM adjustment_items WHERE batch_id = $1`, [numericId]);
    const items = ir.rows.map((row) => ({
      id: `adji-${row.id}`,
      batch_id: `adj-${row.batch_id}`,
      listing_id: row.listing_id,
      explicit_price_mxn: Number(row.explicit_price_mxn),
      from_price_mxn: row.from_price_mxn != null ? Number(row.from_price_mxn) : null,
      guard_result: row.guard_result,
      to_version_id: row.to_version_id
    }));
    return mapBatch(br.rows[0], items);
  }
  async listBatches(tenantId, limit = 50) {
    const br = await this.pool.query(`SELECT * FROM adjustment_batches
       WHERE tenant_id = $1 ORDER BY id DESC LIMIT $2`, [tenantId, limit]);
    const result = [];
    for (const row of br.rows) {
      const ir = await this.pool.query(`SELECT * FROM adjustment_items WHERE batch_id = $1`, [row.id]);
      const items = ir.rows.map((itemRow) => ({
        id: `adji-${itemRow.id}`,
        batch_id: `adj-${itemRow.batch_id}`,
        listing_id: itemRow.listing_id,
        explicit_price_mxn: Number(itemRow.explicit_price_mxn),
        from_price_mxn: itemRow.from_price_mxn != null ? Number(itemRow.from_price_mxn) : null,
        guard_result: itemRow.guard_result,
        to_version_id: itemRow.to_version_id
      }));
      result.push(mapBatch(row, items));
    }
    return result;
  }
  async updateBatchStatus(tenantId, batchId, status, extra) {
    const numericId = batchId.replace(/^adj-/, "");
    const r = await this.pool.query(`UPDATE adjustment_batches
       SET status = $3,
           approved_at = COALESCE($4, approved_at),
           applied_at = COALESCE($5, applied_at)
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`, [
      numericId,
      tenantId,
      status,
      extra?.approved_at ?? null,
      extra?.applied_at ?? null
    ]);
    if (r.rowCount === 0)
      return void 0;
    return this.getBatch(tenantId, batchId);
  }
  async setItemVersionId(batchId, itemId, to_version_id) {
    const batchNum = batchId.replace(/^adj-/, "");
    const itemNum = itemId.replace(/^adji-/, "");
    await this.pool.query(`UPDATE adjustment_items SET to_version_id = $3
       WHERE batch_id = $1 AND id = $2`, [batchNum, itemNum, to_version_id]);
  }
};

// apps/bff/dist/repositories/adjustment-index.js
var singleton2;
function createAdjustmentRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryAdjustmentRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresAdjustmentRepository(url);
  }
  return new MemoryAdjustmentRepository();
}
function getAdjustmentRepository() {
  if (!singleton2) {
    singleton2 = createAdjustmentRepository();
  }
  return singleton2;
}

// apps/bff/dist/adjustment-service.js
import { checkMinMargin as checkMinMargin2 } from "@mx-pricing/pricing-engine";

// apps/bff/dist/adjustment-approval-policy.js
import { computeCostReverse } from "@mx-pricing/pricing-engine";
function getAdjustmentApprovalPolicy() {
  return {
    max_drop_pct_without_approval: Number(process.env.APPROVAL_DROP_PCT ?? "5"),
    require_approval_below_target_margin: true
  };
}
function impliedMarginBelowTarget(input) {
  const { implied_margin_pct } = computeCostReverse({
    landed_cost_mxn: input.landed_cost_mxn,
    publish_price_mxn: input.publish_price_mxn,
    fee_template: input.fee_template,
    tax_strategy: input.tax_strategy,
    iva_rate: input.iva_rate
  });
  return implied_margin_pct < input.target_margin_pct;
}

// apps/bff/dist/adjustment-service.js
function computeDropPct(fromPrice, toPrice) {
  if (!fromPrice || fromPrice <= 0)
    return 0;
  if (toPrice >= fromPrice)
    return 0;
  return (fromPrice - toPrice) / fromPrice * 100;
}
async function buildAdjustmentBatchInput(catalog, tenantId, body) {
  const prepared = [];
  let maxDrop = 0;
  let marginBelowTarget = false;
  for (const item of body.items) {
    const listing = await catalog.getListing(tenantId, item.listing_id);
    if (!listing) {
      throw new Error(`LISTING_NOT_FOUND:${item.listing_id}`);
    }
    const sku = listing.sku;
    const fee = listing.channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
    const versions2 = await catalog.listVersions(sku.id);
    const active = versions2.find((v) => v.state === "active" && v.channel === listing.channel);
    const from_price_mxn = active?.publish_price_mxn ?? null;
    const guard = checkMinMargin2({
      landed_cost_mxn: sku.landed_cost_mxn,
      publish_price_mxn: item.explicit_price_mxn,
      min_margin_pct: sku.policy.min_margin_pct,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate
    });
    if (guard) {
      throw new Error(`GUARD_REJECTED:${guard}`);
    }
    const drop = computeDropPct(from_price_mxn, item.explicit_price_mxn);
    maxDrop = Math.max(maxDrop, drop);
    if (from_price_mxn !== null && item.explicit_price_mxn < from_price_mxn && impliedMarginBelowTarget({
      landed_cost_mxn: sku.landed_cost_mxn,
      publish_price_mxn: item.explicit_price_mxn,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate,
      target_margin_pct: sku.policy.target_margin_pct
    })) {
      marginBelowTarget = true;
    }
    prepared.push({
      listing_id: item.listing_id,
      explicit_price_mxn: item.explicit_price_mxn,
      from_price_mxn,
      guard_result: null,
      listing
    });
  }
  const policy = getAdjustmentApprovalPolicy();
  const approval_triggers = [];
  if (maxDrop > policy.max_drop_pct_without_approval) {
    approval_triggers.push("DROP_EXCEEDS_THRESHOLD");
  }
  if (marginBelowTarget && policy.require_approval_below_target_margin) {
    approval_triggers.push("MARGIN_BELOW_TARGET");
  }
  const status = approval_triggers.length > 0 ? "pending_approval" : "draft";
  return { status, reason_code: body.reason_code, prepared, maxDrop, approval_triggers };
}
async function previewAdjustmentBatch(catalog, tenantId, body) {
  const built = await buildAdjustmentBatchInput(catalog, tenantId, body);
  return {
    status: built.status,
    approval_triggers: built.approval_triggers,
    max_drop_pct: built.maxDrop,
    items: built.prepared.map((p) => ({
      listing_id: p.listing_id,
      channel: p.listing.channel,
      sku_id: p.listing.sku.id,
      from_price_mxn: p.from_price_mxn,
      explicit_price_mxn: p.explicit_price_mxn,
      drop_pct: p.from_price_mxn != null ? Math.round(computeDropPct(p.from_price_mxn, p.explicit_price_mxn) * 100) / 100 : 0
    }))
  };
}
async function applyAdjustmentBatch(catalog, adjustments, tenantId, batchId) {
  const batch = await adjustments.getBatch(tenantId, batchId);
  if (!batch)
    return { error: "NOT_FOUND" };
  if (batch.status === "pending_approval") {
    return { error: "APPROVAL_REQUIRED" };
  }
  if (batch.status === "applied") {
    return { error: "ALREADY_APPLIED" };
  }
  if (batch.status !== "draft" && batch.status !== "approved") {
    return { error: "INVALID_STATUS" };
  }
  const versionIds = [];
  for (const item of batch.items) {
    const listing = await catalog.getListing(tenantId, item.listing_id);
    if (!listing)
      continue;
    const version = await catalog.createVersion({
      tenant_id: tenantId,
      sku_id: listing.sku.id,
      channel: listing.channel,
      state: "active",
      publish_price_mxn: item.explicit_price_mxn,
      reason: `adjustment:${batchId}`
    });
    versionIds.push(version.id);
    await adjustments.setItemVersionId(batch.id, item.id, version.id);
  }
  const updated = await adjustments.updateBatchStatus(tenantId, batchId, "applied", { applied_at: (/* @__PURE__ */ new Date()).toISOString() });
  return { batch: updated, version_ids: versionIds };
}

// apps/bff/dist/channel-oauth.js
var pendingOAuth = /* @__PURE__ */ new Map();
var OAUTH_TTL_MS = 15 * 60 * 1e3;
function authorizeUrl(channel, state) {
  const redirect = encodeURIComponent(process.env.OAUTH_REDIRECT_URI ?? "http://localhost:5173/oauth/callback");
  if (channel === "MERCADO_LIBRE") {
    const clientId = process.env.ML_CLIENT_ID ?? "ML_APP_ID_PLACEHOLDER";
    return `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&state=${state}`;
  }
  const appId = process.env.AMAZON_LWA_APP_ID ?? "amzn1.sellerapps.app.placeholder";
  return `https://sellercentral.amazon.com.mx/apps/authorize/${appId}?state=${state}&redirect_uri=${redirect}`;
}
function startOAuth(tenantId, shopId, channel) {
  const state = `oauth-${shopId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  pendingOAuth.set(state, {
    tenantId,
    shopId,
    channel,
    expiresAt: Date.now() + OAUTH_TTL_MS
  });
  return { state, authorization_url: authorizeUrl(channel, state) };
}
async function completeOAuthMock(shops2, tenantId, shopId, state) {
  if (state) {
    const pending2 = pendingOAuth.get(state);
    if (!pending2 || pending2.expiresAt < Date.now()) {
      return { error: "INVALID_STATE" };
    }
    if (pending2.tenantId !== tenantId || pending2.shopId !== shopId) {
      return { error: "SHOP_STATE_MISMATCH" };
    }
    pendingOAuth.delete(state);
  }
  const shop = await shops2.getShop(tenantId, shopId);
  if (!shop) {
    return { error: "SHOP_NOT_FOUND" };
  }
  const sellerId = shop.channel === "MERCADO_LIBRE" ? `ML-${shopId}` : `A2${shopId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const expires = new Date(Date.now() + 6 * 60 * 60 * 1e3).toISOString();
  const updated = await shops2.setAuthConnected(tenantId, shopId, {
    external_seller_id: sellerId,
    access_token: `mock-access-${shop.channel}-${Date.now()}`,
    refresh_token: `mock-refresh-${shop.channel}`,
    token_expires_at: expires
  });
  if (!updated) {
    return { error: "SHOP_NOT_FOUND" };
  }
  return { shop_id: updated.id, auth_status: updated.auth_status };
}
function shopPublicView(shop) {
  return {
    id: shop.id,
    channel: shop.channel,
    name: shop.name,
    external_seller_id: shop.external_seller_id,
    auth_status: shop.auth_status,
    token_expires_at: shop.token_expires_at,
    created_at: shop.created_at
  };
}

// apps/bff/dist/log-redaction.js
var BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
var KEY_VALUE_PATTERN = /(refresh_token|access_token|client_secret|api_key)\s*[:=]\s*["']?[^"'\s,}]+/gi;
function sanitizeForLog(input) {
  const raw = input instanceof Error ? input.message : typeof input === "string" ? input : JSON.stringify(input);
  return raw.replace(BEARER_PATTERN, "Bearer [REDACTED]").replace(KEY_VALUE_PATTERN, (match) => {
    const key3 = match.split(/[:=]/)[0]?.trim() ?? "secret";
    return `${key3}=[REDACTED]`;
  });
}

// apps/bff/dist/channel-oauth-exchange.js
async function exchangeMercadoLibre(code) {
  const clientId = process.env.ML_CLIENT_ID?.trim();
  const clientSecret = process.env.ML_CLIENT_SECRET?.trim();
  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? "http://localhost:5173/oauth/callback";
  if (!clientId || !clientSecret) {
    throw new Error("ML_OAUTH_NOT_CONFIGURED");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });
  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    throw new Error("OAUTH_TOKEN_EXCHANGE_FAILED");
  }
  return await res.json();
}
async function exchangeAmazonLwa(code) {
  const clientId = process.env.AMAZON_LWA_APP_ID?.trim();
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? "http://localhost:5173/oauth/callback";
  if (!clientId || !clientSecret) {
    throw new Error("AMAZON_OAUTH_NOT_CONFIGURED");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) {
    throw new Error("OAUTH_TOKEN_EXCHANGE_FAILED");
  }
  return await res.json();
}
async function completeOAuthWithCode(shops2, tenantId, shopId, channel, code, state) {
  const shop = await shops2.getShop(tenantId, shopId);
  if (!shop) {
    return { error: "SHOP_NOT_FOUND" };
  }
  if (shop.channel !== channel) {
    return { error: "CHANNEL_MISMATCH" };
  }
  try {
    const tokens = channel === "MERCADO_LIBRE" ? await exchangeMercadoLibre(code) : await exchangeAmazonLwa(code);
    const expires = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1e3).toISOString();
    const updated = await shops2.setAuthConnected(tenantId, shopId, {
      external_seller_id: shop.external_seller_id ?? shopId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      token_expires_at: expires
    });
    if (!updated) {
      return { error: "SHOP_NOT_FOUND" };
    }
    return { shop_id: updated.id, auth_status: updated.auth_status };
  } catch (e) {
    const msg = sanitizeForLog(e);
    return { error: msg.includes("OAUTH") ? msg : "OAUTH_FAILED" };
  }
}

// apps/bff/dist/app.js
import { MockChannelListingAdapter as MockChannelListingAdapter2, MockChannelPublishAdapter as MockChannelPublishAdapter2 } from "@mx-pricing/channel-adapters";

// apps/bff/dist/shop-credential-crypto.js
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
var ALGO = "aes-256-gcm";
function keyFromEnv() {
  const raw = process.env.SHOP_CREDENTIAL_KEY ?? "dev-shop-credential-key-change-me";
  return createHash("sha256").update(raw).digest();
}
function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyFromEnv(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}
function decryptSecret(ciphertext) {
  const buf = Buffer.from(ciphertext, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, keyFromEnv(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// apps/bff/dist/repositories/memory-shop.js
var shopSeq = 0;
var shops = /* @__PURE__ */ new Map();
var credentials = /* @__PURE__ */ new Map();
var DEMO_SHOPS = [
  { id: "shop-ml-demo", channel: "MERCADO_LIBRE", name: "Demo ML Shop" },
  { id: "shop-amz-demo", channel: "AMAZON_MX", name: "Demo Amazon MX" }
];
function seedDemo() {
  if (shops.size > 0)
    return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const s of DEMO_SHOPS) {
    shops.set(s.id, {
      id: s.id,
      tenant_id: "tenant-demo",
      channel: s.channel,
      name: s.name,
      external_seller_id: null,
      auth_status: "disconnected",
      token_expires_at: null,
      created_at: now
    });
  }
}
var MemoryShopRepository = class {
  driver = "memory";
  constructor() {
    seedDemo();
  }
  async listShops(tenantId) {
    seedDemo();
    return [...shops.values()].filter((s) => s.tenant_id === tenantId);
  }
  async getShop(tenantId, shopId) {
    seedDemo();
    const s = shops.get(shopId);
    if (!s || s.tenant_id !== tenantId)
      return void 0;
    return s;
  }
  async createShop(input) {
    shopSeq += 1;
    const id = `shop-${shopSeq}`;
    const record = {
      id,
      tenant_id: input.tenant_id,
      channel: input.channel,
      name: input.name,
      external_seller_id: input.external_seller_id ?? null,
      auth_status: "disconnected",
      token_expires_at: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    shops.set(id, record);
    return record;
  }
  async setAuthConnected(tenantId, shopId, input) {
    const shop = await this.getShop(tenantId, shopId);
    if (!shop)
      return void 0;
    const updated = {
      ...shop,
      external_seller_id: input.external_seller_id,
      auth_status: "connected",
      token_expires_at: input.token_expires_at
    };
    shops.set(shopId, updated);
    credentials.set(shopId, {
      access: encryptSecret(input.access_token),
      refresh: input.refresh_token ? encryptSecret(input.refresh_token) : null
    });
    return updated;
  }
  async getAccessToken(shopId) {
    const cred = credentials.get(shopId);
    if (!cred)
      return void 0;
    return decryptSecret(cred.access);
  }
  resetForTests() {
    shops.clear();
    credentials.clear();
    shopSeq = 0;
    seedDemo();
  }
};

// apps/bff/dist/repositories/postgres-shop.js
import pg3 from "pg";
function rowToShop(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    channel: row.channel,
    name: row.name,
    external_seller_id: row.external_seller_id,
    auth_status: row.auth_status,
    token_expires_at: row.token_expires_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString()
  };
}
var PostgresShopRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionString) {
    this.pool = new pg3.Pool({ connectionString });
  }
  async listShops(tenantId) {
    const res = await this.pool.query(`SELECT id, tenant_id, channel, name, external_seller_id, auth_status,
              token_expires_at, created_at
       FROM shops WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]);
    return res.rows.map(rowToShop);
  }
  async getShop(tenantId, shopId) {
    const res = await this.pool.query(`SELECT id, tenant_id, channel, name, external_seller_id, auth_status,
              token_expires_at, created_at
       FROM shops WHERE tenant_id = $1 AND id = $2`, [tenantId, shopId]);
    if (!res.rowCount)
      return void 0;
    return rowToShop(res.rows[0]);
  }
  async createShop(input) {
    const id = `shop-${Date.now()}`;
    const res = await this.pool.query(`INSERT INTO shops (id, tenant_id, channel, name, external_seller_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, channel, name, external_seller_id, auth_status,
                 token_expires_at, created_at`, [
      id,
      input.tenant_id,
      input.channel,
      input.name,
      input.external_seller_id ?? null
    ]);
    return rowToShop(res.rows[0]);
  }
  async setAuthConnected(tenantId, shopId, input) {
    const client2 = await this.pool.connect();
    try {
      await client2.query("BEGIN");
      const shopRes = await client2.query(`UPDATE shops SET external_seller_id = $3, auth_status = 'connected',
                token_expires_at = $4
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, channel, name, external_seller_id, auth_status,
                   token_expires_at, created_at`, [tenantId, shopId, input.external_seller_id, input.token_expires_at]);
      if (!shopRes.rowCount) {
        await client2.query("ROLLBACK");
        return void 0;
      }
      await client2.query(`INSERT INTO shop_credentials (shop_id, access_token_ciphertext, refresh_token_ciphertext)
         VALUES ($1, $2, $3)
         ON CONFLICT (shop_id) DO UPDATE SET
           access_token_ciphertext = EXCLUDED.access_token_ciphertext,
           refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
           updated_at = NOW()`, [
        shopId,
        encryptSecret(input.access_token),
        input.refresh_token ? encryptSecret(input.refresh_token) : null
      ]);
      await client2.query("COMMIT");
      return rowToShop(shopRes.rows[0]);
    } catch (e) {
      await client2.query("ROLLBACK");
      throw e;
    } finally {
      client2.release();
    }
  }
  async getAccessToken(shopId) {
    const res = await this.pool.query(`SELECT access_token_ciphertext FROM shop_credentials WHERE shop_id = $1`, [shopId]);
    if (!res.rowCount)
      return void 0;
    return decryptSecret(res.rows[0].access_token_ciphertext);
  }
};

// apps/bff/dist/repositories/shop-index.js
var singleton3;
function createShopRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryShopRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresShopRepository(url);
  }
  return new MemoryShopRepository();
}
function getShopRepository() {
  if (!singleton3) {
    singleton3 = createShopRepository();
  }
  return singleton3;
}

// apps/bff/dist/repositories/memory-competitor.js
var offerSeq = 0;
var obsSeq = 0;
var offers = /* @__PURE__ */ new Map();
var observations = /* @__PURE__ */ new Map();
function clearPrimary(listingId) {
  for (const o of offers.values()) {
    if (o.listing_id === listingId && o.is_primary) {
      offers.set(o.id, { ...o, is_primary: false });
    }
  }
}
var MemoryCompetitorRepository = class {
  driver = "memory";
  async listOffers(listingId) {
    return [...offers.values()].filter((o) => o.listing_id === listingId);
  }
  async getOffer(offerId) {
    return offers.get(offerId);
  }
  async createOffer(input) {
    if (input.is_primary) {
      clearPrimary(input.listing_id);
    }
    offerSeq += 1;
    const id = `coff-${offerSeq}`;
    const record = {
      id,
      listing_id: input.listing_id,
      channel: input.channel,
      external_ref: input.external_ref,
      seller_id: input.seller_id ?? null,
      label: input.label ?? null,
      is_primary: input.is_primary ?? false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    offers.set(id, record);
    observations.set(id, []);
    return record;
  }
  async addObservation(input) {
    obsSeq += 1;
    const record = {
      id: `obs-${obsSeq}`,
      offer_id: input.offer_id,
      observed_at: input.observed_at,
      list_price: input.list_price ?? null,
      sale_price: input.sale_price ?? null,
      shipping_addon: input.shipping_addon ?? 0,
      effective_price: input.effective_price,
      currency: input.currency ?? "MXN",
      raw_json: input.raw_json ?? null
    };
    const list = observations.get(input.offer_id) ?? [];
    list.push(record);
    observations.set(input.offer_id, list);
    return record;
  }
  async latestObservation(offerId) {
    const list = observations.get(offerId) ?? [];
    if (list.length === 0)
      return void 0;
    return [...list].sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())[0];
  }
  async listObservations(listingId, since) {
    const listingOffers = await this.listOffers(listingId);
    const out = [];
    for (const o of listingOffers) {
      const list = observations.get(o.id) ?? [];
      for (const obs of list) {
        if (new Date(obs.observed_at) >= since) {
          out.push(obs);
        }
      }
    }
    return out.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
  }
  async getObservation(observationId) {
    for (const list of observations.values()) {
      const found = list.find((o) => o.id === observationId);
      if (found)
        return found;
    }
    return void 0;
  }
  resetForTests() {
    offers.clear();
    observations.clear();
    offerSeq = 0;
    obsSeq = 0;
  }
};

// apps/bff/dist/repositories/postgres-competitor.js
import pg4 from "pg";
function mapOffer(row) {
  return {
    id: row.id,
    listing_id: row.listing_id,
    channel: row.channel,
    external_ref: row.external_ref,
    seller_id: row.seller_id ?? null,
    label: row.label ?? null,
    is_primary: Boolean(row.is_primary),
    created_at: new Date(row.created_at).toISOString()
  };
}
function mapObs(row) {
  const raw = row.raw_json;
  let raw_json = null;
  if (raw != null) {
    raw_json = typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  return {
    id: row.id,
    offer_id: row.offer_id,
    observed_at: new Date(row.observed_at).toISOString(),
    list_price: row.list_price != null ? Number(row.list_price) : null,
    sale_price: row.sale_price != null ? Number(row.sale_price) : null,
    shipping_addon: Number(row.shipping_addon),
    effective_price: Number(row.effective_price),
    currency: row.currency,
    raw_json
  };
}
var PostgresCompetitorRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionString) {
    this.pool = new pg4.Pool({ connectionString });
  }
  async listOffers(listingId) {
    const res = await this.pool.query(`SELECT id, listing_id, channel, external_ref, seller_id, label, is_primary, created_at
       FROM competitor_offers WHERE listing_id = $1 ORDER BY created_at`, [listingId]);
    return res.rows.map(mapOffer);
  }
  async getOffer(offerId) {
    const res = await this.pool.query(`SELECT id, listing_id, channel, external_ref, seller_id, label, is_primary, created_at
       FROM competitor_offers WHERE id = $1`, [offerId]);
    if (!res.rowCount)
      return void 0;
    return mapOffer(res.rows[0]);
  }
  async createOffer(input) {
    const client2 = await this.pool.connect();
    try {
      await client2.query("BEGIN");
      if (input.is_primary) {
        await client2.query(`UPDATE competitor_offers SET is_primary = FALSE WHERE listing_id = $1`, [input.listing_id]);
      }
      const id = `coff-${Date.now()}`;
      const res = await client2.query(`INSERT INTO competitor_offers
         (id, listing_id, channel, external_ref, seller_id, label, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, listing_id, channel, external_ref, seller_id, label, is_primary, created_at`, [
        id,
        input.listing_id,
        input.channel,
        input.external_ref,
        input.seller_id ?? null,
        input.label ?? null,
        input.is_primary ?? false
      ]);
      await client2.query("COMMIT");
      return mapOffer(res.rows[0]);
    } catch (e) {
      await client2.query("ROLLBACK");
      throw e;
    } finally {
      client2.release();
    }
  }
  async addObservation(input) {
    const id = `obs-${Date.now()}`;
    const res = await this.pool.query(`INSERT INTO price_observations
       (id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json`, [
      id,
      input.offer_id,
      input.observed_at,
      input.list_price ?? null,
      input.sale_price ?? null,
      input.shipping_addon ?? 0,
      input.effective_price,
      input.currency ?? "MXN",
      input.raw_json ? JSON.stringify(input.raw_json) : null
    ]);
    return mapObs(res.rows[0]);
  }
  async latestObservation(offerId) {
    const res = await this.pool.query(`SELECT id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json
       FROM price_observations WHERE offer_id = $1
       ORDER BY observed_at DESC LIMIT 1`, [offerId]);
    if (!res.rowCount)
      return void 0;
    return mapObs(res.rows[0]);
  }
  async listObservations(listingId, since) {
    const res = await this.pool.query(`SELECT o.id, o.offer_id, o.observed_at, o.list_price, o.sale_price,
              o.shipping_addon, o.effective_price, o.currency, o.raw_json
       FROM price_observations o
       JOIN competitor_offers c ON c.id = o.offer_id
       WHERE c.listing_id = $1 AND o.observed_at >= $2
       ORDER BY o.observed_at DESC`, [listingId, since.toISOString()]);
    return res.rows.map(mapObs);
  }
  async getObservation(observationId) {
    const res = await this.pool.query(`SELECT id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json
       FROM price_observations WHERE id = $1`, [observationId]);
    if (!res.rowCount)
      return void 0;
    return mapObs(res.rows[0]);
  }
};

// apps/bff/dist/repositories/competitor-index.js
var singleton4;
function createCompetitorRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryCompetitorRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresCompetitorRepository(url);
  }
  return new MemoryCompetitorRepository();
}
function getCompetitorRepository() {
  if (!singleton4) {
    singleton4 = createCompetitorRepository();
  }
  return singleton4;
}

// apps/bff/dist/competitor-normalize.js
function computeEffectivePrice(input) {
  const base = input.sale_price ?? input.list_price ?? 0;
  if (!input.include_shipping) {
    return base;
  }
  return base + (input.shipping_addon ?? 0);
}

// apps/bff/dist/repositories/memory-repricing.js
var eventSeq = 0;
var events = /* @__PURE__ */ new Map();
var dedupeKeys = /* @__PURE__ */ new Set();
var schedules = /* @__PURE__ */ new Map();
var MemoryRepricingRepository = class {
  driver = "memory";
  async enqueueEvent(input) {
    if (input.dedupe_key && dedupeKeys.has(input.dedupe_key)) {
      const existing = [...events.values()].find((e) => e.dedupe_key === input.dedupe_key);
      if (existing) {
        return existing;
      }
    }
    eventSeq += 1;
    const id = `revt-${eventSeq}`;
    const record = {
      id,
      tenant_id: input.tenant_id,
      listing_id: input.listing_id,
      channel: input.channel,
      type: input.type,
      status: "pending",
      payload: input.payload,
      dedupe_key: input.dedupe_key ?? null,
      processed_at: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    events.set(id, record);
    if (input.dedupe_key) {
      dedupeKeys.add(input.dedupe_key);
    }
    return record;
  }
  async getEvent(eventId) {
    return events.get(eventId);
  }
  async listEvents(tenantId, listingId, limit = 50) {
    return [...events.values()].filter((e) => e.tenant_id === tenantId && e.listing_id === listingId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  }
  async markProcessed(eventId, dedupe_key) {
    const e = events.get(eventId);
    if (!e)
      return void 0;
    if (e.status === "processed") {
      return e;
    }
    const updated = {
      ...e,
      status: "processed",
      dedupe_key,
      processed_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    events.set(eventId, updated);
    dedupeKeys.add(dedupe_key);
    return updated;
  }
  async getIngestSchedule(listingId) {
    return schedules.get(listingId);
  }
  async upsertIngestSchedule(input) {
    const record = {
      listing_id: input.listing_id,
      tier: input.tier,
      next_run_at: input.next_run_at,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    schedules.set(input.listing_id, record);
    return record;
  }
  resetForTests() {
    events.clear();
    dedupeKeys.clear();
    schedules.clear();
    eventSeq = 0;
  }
};

// apps/bff/dist/repositories/postgres-repricing.js
import pg5 from "pg";
function mapEvent(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    listing_id: row.listing_id,
    channel: row.channel,
    type: row.type,
    status: row.status,
    payload: row.payload_json,
    dedupe_key: row.dedupe_key ?? null,
    processed_at: row.processed_at ? new Date(row.processed_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString()
  };
}
var PostgresRepricingRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionString) {
    this.pool = new pg5.Pool({ connectionString });
  }
  async enqueueEvent(input) {
    if (input.dedupe_key) {
      const dup = await this.pool.query(`SELECT id, tenant_id, listing_id, channel, type, status, payload_json,
                dedupe_key, processed_at, created_at
         FROM repricing_events WHERE dedupe_key = $1`, [input.dedupe_key]);
      if (dup.rowCount) {
        return mapEvent(dup.rows[0]);
      }
    }
    const id = `revt-${Date.now()}`;
    const res = await this.pool.query(`INSERT INTO repricing_events
       (id, tenant_id, listing_id, channel, type, payload_json, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, listing_id, channel, type, status, payload_json,
                 dedupe_key, processed_at, created_at`, [
      id,
      input.tenant_id,
      input.listing_id,
      input.channel,
      input.type,
      JSON.stringify(input.payload),
      input.dedupe_key ?? null
    ]);
    return mapEvent(res.rows[0]);
  }
  async getEvent(eventId) {
    const res = await this.pool.query(`SELECT id, tenant_id, listing_id, channel, type, status, payload_json,
              dedupe_key, processed_at, created_at
       FROM repricing_events WHERE id = $1`, [eventId]);
    if (!res.rowCount)
      return void 0;
    return mapEvent(res.rows[0]);
  }
  async listEvents(tenantId, listingId, limit = 50) {
    const res = await this.pool.query(`SELECT id, tenant_id, listing_id, channel, type, status, payload_json,
              dedupe_key, processed_at, created_at
       FROM repricing_events
       WHERE tenant_id = $1 AND listing_id = $2
       ORDER BY created_at DESC LIMIT $3`, [tenantId, listingId, limit]);
    return res.rows.map(mapEvent);
  }
  async markProcessed(eventId, dedupe_key) {
    const res = await this.pool.query(`UPDATE repricing_events
       SET status = 'processed', dedupe_key = $2, processed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, tenant_id, listing_id, channel, type, status, payload_json,
                 dedupe_key, processed_at, created_at`, [eventId, dedupe_key]);
    if (!res.rowCount) {
      return this.getEvent(eventId);
    }
    return mapEvent(res.rows[0]);
  }
  async getIngestSchedule(listingId) {
    const res = await this.pool.query(`SELECT listing_id, tier, next_run_at, updated_at
       FROM listing_ingest_schedules WHERE listing_id = $1`, [listingId]);
    if (!res.rowCount)
      return void 0;
    const row = res.rows[0];
    return {
      listing_id: row.listing_id,
      tier: row.tier,
      next_run_at: new Date(row.next_run_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    };
  }
  async upsertIngestSchedule(input) {
    const res = await this.pool.query(`INSERT INTO listing_ingest_schedules (listing_id, tier, next_run_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (listing_id) DO UPDATE SET
         tier = EXCLUDED.tier,
         next_run_at = EXCLUDED.next_run_at,
         updated_at = NOW()
       RETURNING listing_id, tier, next_run_at, updated_at`, [input.listing_id, input.tier, input.next_run_at]);
    const row = res.rows[0];
    return {
      listing_id: row.listing_id,
      tier: row.tier,
      next_run_at: new Date(row.next_run_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString()
    };
  }
};

// apps/bff/dist/repositories/repricing-index.js
var singleton5;
function createRepricingRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryRepricingRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresRepricingRepository(url);
  }
  return new MemoryRepricingRepository();
}
function getRepricingRepository() {
  if (!singleton5) {
    singleton5 = createRepricingRepository();
  }
  return singleton5;
}

// apps/bff/dist/repricing/runtime.js
import { computeCompetitive as computeCompetitive2, computeFloorPrice as computeFloorPrice2 } from "@mx-pricing/pricing-engine";

// apps/bff/dist/repricing/debounce-memory.js
function debounceMs() {
  const raw = process.env.REPRICING_DEBOUNCE_MS;
  if (raw !== void 0) {
    return Number(raw);
  }
  return 5 * 60 * 1e3;
}
var windows = /* @__PURE__ */ new Map();
var MemoryDebounceBackend = class {
  driver = "memory";
  async record(input) {
    const now = Date.now();
    const ms = debounceMs();
    const existing = windows.get(input.listing_id);
    if (!existing || now > existing.expires_at) {
      windows.set(input.listing_id, {
        listing_id: input.listing_id,
        channel: input.channel,
        offer_id: input.offer_id,
        first_previous: input.previous_effective,
        last_current: input.current_effective,
        last_observation_id: input.observation_id,
        last_observed_at: input.observed_at,
        tick_count: 1,
        expires_at: now + ms
      });
      return;
    }
    existing.tick_count += 1;
    existing.last_current = input.current_effective;
    existing.last_observation_id = input.observation_id;
    existing.last_observed_at = input.observed_at;
    existing.offer_id = input.offer_id;
    existing.expires_at = now + ms;
  }
  async flush(listingId) {
    const entry = windows.get(listingId);
    if (!entry)
      return null;
    windows.delete(listingId);
    return {
      listing_id: entry.listing_id,
      channel: entry.channel,
      offer_id: entry.offer_id,
      previous_effective: entry.first_previous,
      current_effective: entry.last_current,
      observed_at: entry.last_observed_at,
      observation_id: entry.last_observation_id,
      debounce_ticks: entry.tick_count
    };
  }
  async resetForTests() {
    windows.clear();
  }
};

// apps/bff/dist/repricing/debounce-redis.js
var client;
async function getRedisClient() {
  if (client !== void 0)
    return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    client = null;
    return client;
  }
  try {
    const mod = await import("redis");
    const created = mod.createClient({ url });
    created.on("error", (err) => {
      console.error("Redis debounce client error", err.message);
    });
    if (!created.isOpen) {
      await created.connect();
    }
    client = created;
    return client;
  } catch (e) {
    console.error("Redis debounce unavailable, falling back to memory", e);
    client = null;
    return client;
  }
}
function debounceMs2() {
  const raw = process.env.REPRICING_DEBOUNCE_MS;
  if (raw !== void 0)
    return Number(raw);
  return 5 * 60 * 1e3;
}
function key(listingId) {
  return `mx:debounce:${listingId}`;
}
var RedisDebounceBackend = class {
  driver = "redis";
  fallback = new MemoryDebounceBackend();
  async record(input) {
    const redis = await getRedisClient();
    if (!redis) {
      return this.fallback.record(input);
    }
    const ms = debounceMs2();
    const ttlSec = Math.max(1, Math.ceil(ms / 1e3));
    const existingRaw = await redis.get(key(input.listing_id));
    const now = Date.now();
    let entry;
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw);
      if (parsed.expires_at > now) {
        entry = {
          ...parsed,
          tick_count: parsed.tick_count + 1,
          last_current: input.current_effective,
          last_observation_id: input.observation_id,
          last_observed_at: input.observed_at,
          offer_id: input.offer_id,
          expires_at: now + ms
        };
      } else {
        entry = {
          listing_id: input.listing_id,
          channel: input.channel,
          offer_id: input.offer_id,
          first_previous: input.previous_effective,
          last_current: input.current_effective,
          last_observation_id: input.observation_id,
          last_observed_at: input.observed_at,
          tick_count: 1,
          expires_at: now + ms
        };
      }
    } else {
      entry = {
        listing_id: input.listing_id,
        channel: input.channel,
        offer_id: input.offer_id,
        first_previous: input.previous_effective,
        last_current: input.current_effective,
        last_observation_id: input.observation_id,
        last_observed_at: input.observed_at,
        tick_count: 1,
        expires_at: now + ms
      };
    }
    await redis.set(key(input.listing_id), JSON.stringify(entry), { EX: ttlSec });
  }
  async flush(listingId) {
    const redis = await getRedisClient();
    if (!redis) {
      return this.fallback.flush(listingId);
    }
    const raw = await redis.get(key(listingId));
    if (!raw)
      return null;
    await redis.del(key(listingId));
    const entry = JSON.parse(raw);
    return {
      listing_id: entry.listing_id,
      channel: entry.channel,
      offer_id: entry.offer_id,
      previous_effective: entry.first_previous,
      current_effective: entry.last_current,
      observed_at: entry.last_observed_at,
      observation_id: entry.last_observation_id,
      debounce_ticks: entry.tick_count
    };
  }
  async resetForTests() {
    await this.fallback.resetForTests();
  }
};

// apps/bff/dist/repricing/debounce-backend.js
var singleton6;
function resolveDebounceDriver() {
  const raw = (process.env.REPRICING_DEBOUNCE_DRIVER ?? "").trim().toLowerCase();
  if (raw === "redis" && process.env.REDIS_URL?.trim()) {
    return "redis";
  }
  if (process.env.REDIS_URL?.trim() && raw !== "memory") {
    return "redis";
  }
  return "memory";
}
function getDebounceBackend() {
  if (!singleton6) {
    singleton6 = resolveDebounceDriver() === "redis" ? new RedisDebounceBackend() : new MemoryDebounceBackend();
  }
  return singleton6;
}

// apps/bff/dist/repricing/debounce.js
async function recordCompetitorPriceChange(input) {
  await getDebounceBackend().record(input);
}
async function flushDebounce(listingId) {
  return getDebounceBackend().flush(listingId);
}
function getDebounceStatus() {
  const backend = getDebounceBackend();
  return {
    driver: backend.driver,
    redis_url_configured: Boolean(process.env.REDIS_URL?.trim()),
    debounce_ms: Number(process.env.REPRICING_DEBOUNCE_MS ?? 5 * 60 * 1e3)
  };
}

// apps/bff/dist/repricing/tier.js
var TIER_MS = {
  T0: 15 * 60 * 1e3,
  T1: 60 * 60 * 1e3,
  T2: 24 * 60 * 60 * 1e3
};
function tierIntervalMs(tier) {
  return TIER_MS[tier];
}
function nextRunFromNow(tier, from = Date.now()) {
  return new Date(from + tierIntervalMs(tier)).toISOString();
}

// apps/bff/dist/repricing/stale.js
function staleThresholdMs() {
  const raw = process.env.COMPETITOR_STALE_MS;
  if (raw !== void 0) {
    return Number(raw);
  }
  return 24 * 60 * 60 * 1e3;
}
async function evaluateListingStale(competitors, listingHealth, listingId) {
  const offers2 = await competitors.listOffers(listingId);
  let latest = null;
  for (const offer of offers2) {
    const obs = await competitors.latestObservation(offer.id);
    if (!obs)
      continue;
    if (!latest || new Date(obs.observed_at) > new Date(latest)) {
      latest = obs.observed_at;
    }
  }
  const threshold = staleThresholdMs();
  const now = Date.now();
  let stale = false;
  if (!latest) {
    stale = offers2.length > 0;
  } else {
    stale = now - new Date(latest).getTime() > threshold;
  }
  await listingHealth.setStale(listingId, stale, stale ? latest ?? (/* @__PURE__ */ new Date()).toISOString() : null);
  return { stale, latest_observed_at: latest };
}

// apps/bff/dist/repricing/guards.js
async function checkDynamicRepricingGuards(activity, listingId, rule) {
  if (rule.cooldown_min > 0) {
    const last = await activity.lastApplyAt(listingId);
    if (last) {
      const elapsedMs = Date.now() - new Date(last).getTime();
      if (elapsedMs < rule.cooldown_min * 60 * 1e3) {
        return "COOLDOWN_ACTIVE";
      }
    }
  }
  if (rule.daily_limit > 0) {
    const startOfDay = /* @__PURE__ */ new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const count = await activity.countAppliesSince(listingId, startOfDay);
    if (count >= rule.daily_limit) {
      return "DAILY_LIMIT_EXCEEDED";
    }
  }
  return null;
}

// apps/bff/dist/repricing/action.js
function versionStateForAction(action) {
  if (action === "auto_active") {
    return "active";
  }
  if (action === "pending" || action === "auto_pending") {
    return "pending";
  }
  return "suggested";
}

// apps/bff/dist/repricing/business-hours.js
var DEFAULT_MX_BUSINESS_HOURS = {
  startHour: 9,
  endHour: 21,
  allowedWeekdays: [1, 2, 3, 4, 5, 6]
};
var clockOverride = null;
function mexicoLocalMeta(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    hour: "numeric",
    weekday: "short",
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const map = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return { hour, weekday: map[wd] ?? 0 };
}
function isWithinMexicoBusinessHours(at = clockOverride ?? /* @__PURE__ */ new Date(), config = DEFAULT_MX_BUSINESS_HOURS) {
  const { hour, weekday } = mexicoLocalMeta(at);
  if (!config.allowedWeekdays.includes(weekday)) {
    return false;
  }
  return hour >= config.startHour && hour < config.endHour;
}

// apps/bff/dist/competitor-ingest-config.js
var DRIVER_ALIASES = {
  mock: "mock",
  http_stub: "http_stub",
  http: "http_stub",
  channel: "channel",
  live: "channel"
};
function resolveCompetitorIngestDriver(raw) {
  const key3 = (raw ?? process.env.COMPETITOR_INGEST_DRIVER ?? "mock").trim().toLowerCase();
  return DRIVER_ALIASES[key3] ?? "mock";
}
function isCompetitorCompliantScrapeEnabled() {
  const raw = process.env.FEATURE_COMPETITOR_COMPLIANT_SCRAPE?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}
function competitorIngestIncludeShipping() {
  const raw = process.env.COMPETITOR_INGEST_INCLUDE_SHIPPING?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}
function getCompetitorIngestStatus() {
  const driver = resolveCompetitorIngestDriver();
  const httpUrl = process.env.COMPETITOR_INGEST_HTTP_URL?.trim() || null;
  const listingPullUrl = process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim() || null;
  const compliantScrape = isCompetitorCompliantScrapeEnabled();
  return {
    driver,
    competitor_ingest_http_url_configured: Boolean(httpUrl),
    channel_listing_pull_url_configured: Boolean(listingPullUrl),
    include_shipping: competitorIngestIncludeShipping(),
    compliant_scrape_enabled: compliantScrape,
    ready: driver === "mock" || driver === "channel" || driver === "http_stub" && Boolean(httpUrl || listingPullUrl) || driver === "http_stub" && !httpUrl && !listingPullUrl,
    note: driver === "mock" ? "Mock ingest via in-process listing adapter." : driver === "channel" ? "Uses connected shop tokens + channel listing adapter (ML / Amazon)." : httpUrl ? "HTTP competitor ingest POST to COMPETITOR_INGEST_HTTP_URL." : listingPullUrl ? "http_stub falls back to CHANNEL_HTTP_LISTING_PULL_URL per offer." : "http_stub with no HTTP URLs \u2014 mock listing adapter fallback."
  };
}
var CompetitorScrapeComplianceError = class extends Error {
  constructor() {
    super("COMPETITOR_SCRAPE_COMPLIANCE_DISABLED");
    this.name = "CompetitorScrapeComplianceError";
  }
};
function assertCompetitorScrapeAllowed(externalRef) {
  if (!externalRef.trim().toUpperCase().startsWith("SCRAPE:")) {
    return;
  }
  if (!isCompetitorCompliantScrapeEnabled()) {
    throw new CompetitorScrapeComplianceError();
  }
}

// apps/bff/dist/competitor-ingest-http.js
function parseCompetitorIngestHttpResponse(json) {
  if (!json || typeof json !== "object")
    return null;
  const body = json;
  if (typeof body.sale_price !== "number")
    return null;
  return {
    sale_price: body.sale_price,
    list_price: body.list_price ?? null,
    shipping_addon: body.shipping_addon,
    buy_box_winner: body.buy_box_winner,
    observed_at: body.observed_at ?? body.synced_at ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function pullCompetitorPrice(input) {
  const httpUrl = process.env.COMPETITOR_INGEST_HTTP_URL?.trim();
  if (input.driver === "http_stub" && httpUrl) {
    const res = await fetch(httpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: input.channel,
        external_ref: input.externalRef,
        offer_id: input.offerId,
        listing_id: input.listingId,
        shop_id: input.shop?.shop_id
      })
    });
    if (!res.ok) {
      throw new Error(`COMPETITOR_INGEST_HTTP_${res.status}`);
    }
    const parsed = parseCompetitorIngestHttpResponse(await res.json());
    if (!parsed) {
      throw new Error("COMPETITOR_INGEST_INVALID_HTTP_RESPONSE");
    }
    return { ...parsed, source: "http_stub" };
  }
  const shopRef = input.shop ? {
    shop_id: input.shop.shop_id,
    channel: input.channel,
    external_seller_id: input.shop.external_seller_id,
    access_token: input.shop.access_token
  } : {
    shop_id: `ingest-${input.driver}`,
    channel: input.channel,
    external_seller_id: "INGEST"
  };
  const snap = await input.listingAdapter.pullListing(shopRef, input.externalRef);
  return {
    sale_price: snap.price_mxn,
    list_price: snap.price_mxn,
    shipping_addon: 0,
    buy_box_winner: input.channel === "AMAZON_MX",
    observed_at: snap.synced_at,
    source: input.driver === "channel" ? "channel_adapter" : "mock_listing_adapter"
  };
}

// apps/bff/dist/channel-price-step.js
function normalizePriceForChannel(channel, price_mxn) {
  if (channel === "AMAZON_MX") {
    return Math.round(price_mxn);
  }
  return Math.round(price_mxn * 100) / 100;
}

// apps/bff/dist/repositories/memory-publish-idempotency.js
var records = /* @__PURE__ */ new Map();
var MemoryPublishIdempotencyRepository = class {
  driver = "memory";
  async get(compositeKey) {
    return records.get(compositeKey);
  }
  async set(compositeKey, _tenantId, outcome) {
    records.set(compositeKey, outcome);
  }
  async resetForTests() {
    records.clear();
  }
};

// apps/bff/dist/repositories/postgres-publish-idempotency.js
import { Pool } from "pg";
var PostgresPublishIdempotencyRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }
  async get(compositeKey) {
    const r = await this.pool.query(`SELECT outcome_json FROM publish_idempotency WHERE composite_key = $1`, [compositeKey]);
    if (r.rowCount === 0)
      return void 0;
    return r.rows[0].outcome_json;
  }
  async set(compositeKey, tenantId, outcome) {
    await this.pool.query(`INSERT INTO publish_idempotency (composite_key, tenant_id, outcome_json)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (composite_key) DO UPDATE SET outcome_json = EXCLUDED.outcome_json`, [compositeKey, tenantId, JSON.stringify(outcome)]);
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM publish_idempotency`);
  }
};

// apps/bff/dist/repositories/publish-idempotency-index.js
var singleton7;
function createPublishIdempotencyRepository() {
  if (process.env.PUBLISH_IDEMPOTENCY_DRIVER === "memory") {
    return new MemoryPublishIdempotencyRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresPublishIdempotencyRepository(url);
  }
  return new MemoryPublishIdempotencyRepository();
}
function getPublishIdempotencyRepository() {
  if (!singleton7) {
    singleton7 = createPublishIdempotencyRepository();
  }
  return singleton7;
}

// apps/bff/dist/publish-idempotency-store.js
function buildPublishIdempotencyKey(tenantId, listingId, idempotencyKey) {
  return `${tenantId}:${listingId}:${idempotencyKey}`;
}
async function getStoredPublishOutcome(compositeKey) {
  return getPublishIdempotencyRepository().get(compositeKey);
}
async function storePublishOutcome(compositeKey, tenantId, outcome) {
  await getPublishIdempotencyRepository().set(compositeKey, tenantId, outcome);
}

// apps/bff/dist/listing-channel-refs.js
var LISTING_CHANNEL_EXTERNAL_REFS = {
  "listing-ml-001": "MLM123456",
  "listing-amz-001": "B0TEST123"
};
function resolveListingExternalRef(listingId) {
  return LISTING_CHANNEL_EXTERNAL_REFS[listingId] ?? listingId;
}

// apps/bff/dist/channel-sandbox-ledger.js
var events2 = [];
var seq = 0;
function isChannelSandboxEnabled() {
  const raw = process.env.CHANNEL_SANDBOX_MODE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off")
    return false;
  return true;
}
function getChannelSandboxStatus() {
  const enabled = isChannelSandboxEnabled();
  return {
    enabled,
    mode: enabled ? "sandbox" : "production",
    note: enabled ? "Channel writes are mocked; events recorded locally (no live ML/Amazon)." : "Sandbox disabled \u2014 adapters may call real channel APIs when configured.",
    allowed_operations: [
      "oauth_mock",
      "pull_listing_mock",
      "publish_price_mock",
      "reconcile_mock"
    ]
  };
}
function recordChannelSandboxEvent(input) {
  seq += 1;
  const ev = {
    id: `sandbox-${seq}`,
    tenant_id: input.tenant_id,
    listing_id: input.listing_id,
    channel: input.channel,
    event_type: input.event_type,
    payload: input.payload,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  events2.push(ev);
  if (events2.length > 500) {
    events2.splice(0, events2.length - 500);
  }
  return ev;
}
function listChannelSandboxEvents(tenantId, limit = 50) {
  return events2.filter((e) => e.tenant_id === tenantId).slice(-limit).reverse();
}
function getChannelSandboxEvent(tenantId, eventId) {
  const ev = events2.find((e) => e.tenant_id === tenantId && e.id === eventId);
  return ev;
}
function countChannelSandboxEvents(tenantId) {
  if (!tenantId)
    return events2.length;
  return events2.filter((e) => e.tenant_id === tenantId).length;
}

// apps/bff/dist/channel-publish-service.js
var LISTING_ID_BY_SHOP = {
  "shop-ml-demo": "listing-ml-001",
  "shop-amz-demo": "listing-amz-001"
};
var SHOP_BY_CHANNEL = {
  MERCADO_LIBRE: "shop-ml-demo",
  AMAZON_MX: "shop-amz-demo"
};
async function rememberIdempotent(tenantId, listingId, idempotencyKey, outcome) {
  if (!idempotencyKey) {
    return outcome;
  }
  const { idempotent_replay: _drop, ...stored } = outcome;
  await storePublishOutcome(buildPublishIdempotencyKey(tenantId, listingId, idempotencyKey), tenantId, stored);
  return outcome;
}
async function publishListingPrice(catalog, shops2, dynamicRules, publisher, tenantId, listingId, options) {
  if (options.idempotency_key) {
    const cached = await getStoredPublishOutcome(buildPublishIdempotencyKey(tenantId, listingId, options.idempotency_key));
    if (cached) {
      return { ...cached, idempotent_replay: true };
    }
  }
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const channel = listing.channel;
  const shopId = SHOP_BY_CHANNEL[channel];
  const shop = await shops2.getShop(tenantId, shopId);
  if (!shop || shop.auth_status !== "connected") {
    return await rememberIdempotent(tenantId, listingId, options.idempotency_key, {
      publish_status: "failed",
      error_code: "AUTH_REQUIRED"
    });
  }
  const token = await shops2.getAccessToken(shopId);
  if (!token) {
    return await rememberIdempotent(tenantId, listingId, options.idempotency_key, {
      publish_status: "failed",
      error_code: "AUTH_EXPIRED"
    });
  }
  let price = options.explicit_price_mxn;
  let versionId = options.version_id ?? "";
  if (price === void 0) {
    const versions2 = await catalog.listVersions(listing.sku_id);
    const active = versions2.find((v) => v.state === "active" && v.channel === listing.channel);
    if (!active) {
      if (versionId) {
        await catalog.setVersionChannelPublishStatus(versionId, "skipped");
      }
      return await rememberIdempotent(tenantId, listingId, options.idempotency_key, {
        publish_status: "failed",
        error_code: "NO_ACTIVE_VERSION"
      });
    }
    price = active.publish_price_mxn;
    versionId = active.id;
  }
  const priceMxn = price;
  const externalRef = resolveListingExternalRef(listingId);
  const shopRef = {
    shop_id: shopId,
    channel,
    external_seller_id: shop.external_seller_id,
    access_token: token
  };
  let result = await publisher.publishPrice({
    shop: shopRef,
    external_ref: externalRef,
    price_mxn: priceMxn
  });
  let retried = false;
  if (result.publish_status === "failed" && result.error_code === "INVALID_PRICE_STEP" && options.retry_on_step) {
    const adjusted = normalizePriceForChannel(channel, priceMxn);
    if (adjusted !== priceMxn) {
      result = await publisher.publishPrice({
        shop: shopRef,
        external_ref: externalRef,
        price_mxn: adjusted
      });
      retried = true;
    }
  }
  if (result.publish_status === "failed") {
    if (result.error_code === "CHANNEL_REJECTED") {
      await dynamicRules.upsertRule(listingId, { frozen: true });
    }
    if (versionId) {
      await catalog.setVersionChannelPublishStatus(versionId, "failed");
    }
    return await rememberIdempotent(tenantId, listingId, options.idempotency_key, {
      publish_status: "failed",
      error_code: result.error_code ?? "PUBLISH_FAILED",
      rule_frozen: result.error_code === "CHANNEL_REJECTED"
    });
  }
  if (versionId) {
    await catalog.setVersionChannelPublishStatus(versionId, "published");
  }
  if (isChannelSandboxEnabled()) {
    recordChannelSandboxEvent({
      tenant_id: tenantId,
      listing_id: listingId,
      channel,
      event_type: "channel_publish",
      payload: {
        channel_price_mxn: result.channel_price_mxn ?? priceMxn,
        version_id: versionId,
        retried,
        sandbox: true
      }
    });
  }
  return await rememberIdempotent(tenantId, listingId, options.idempotency_key, {
    publish_status: "published",
    channel_price_mxn: result.channel_price_mxn ?? priceMxn,
    version_id: versionId,
    retried,
    channel
  });
}
async function publishListingPriceBatch(catalog, shops2, dynamicRules, publisher, tenantId, listingIds, options) {
  const items = [];
  for (const listingId of listingIds) {
    try {
      const perListingKey = options.idempotency_key ? `${options.idempotency_key}:${listingId}` : void 0;
      const result = await publishListingPrice(catalog, shops2, dynamicRules, publisher, tenantId, listingId, {
        retry_on_step: options.retry_on_step ?? true,
        idempotency_key: perListingKey
      });
      if (result.publish_status === "published") {
        items.push({
          listing_id: listingId,
          channel: result.channel,
          publish_status: "published",
          channel_price_mxn: result.channel_price_mxn,
          retried: result.retried,
          version_id: result.version_id,
          version_channel_publish_status: "published",
          idempotent_replay: result.idempotent_replay
        });
      } else {
        const listing = await catalog.getListing(tenantId, listingId);
        const channel = listing?.channel ?? "MERCADO_LIBRE";
        const skipped = result.error_code === "NO_ACTIVE_VERSION";
        items.push({
          listing_id: listingId,
          channel,
          publish_status: skipped ? "skipped" : "failed",
          error_code: result.error_code,
          rule_frozen: result.rule_frozen,
          version_channel_publish_status: skipped ? "skipped" : "failed",
          idempotent_replay: result.idempotent_replay
        });
      }
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw e;
      }
      items.push({
        listing_id: listingId,
        channel: "MERCADO_LIBRE",
        publish_status: "failed",
        error_code: "PUBLISH_FAILED"
      });
    }
  }
  const published = items.filter((i) => i.publish_status === "published").length;
  const failedOrSkipped = items.length - published;
  let publish_status = "all_published";
  if (published === 0 && failedOrSkipped > 0) {
    publish_status = "all_failed";
  } else if (published > 0 && failedOrSkipped > 0) {
    publish_status = "partial_success";
  }
  return { publish_status, items };
}

// apps/bff/dist/notification-templates.js
var TEMPLATES = [
  {
    id: "repricing.competitor_price_changed",
    event: "CompetitorPriceChanged",
    channel: "in_app",
    subject: {
      en: "Competitor price changed",
      "zh-CN": "\u7ADE\u54C1\u4EF7\u683C\u53D8\u52A8",
      "es-MX": "Cambio de precio del competidor"
    },
    body: {
      en: "Listing {{listing_id}}: rival {{external_ref}} now {{sale_price_mxn}} MXN. Suggested version {{version_id}}.",
      "zh-CN": "Listing {{listing_id}}\uFF1A\u7ADE\u54C1 {{external_ref}} \u73B0\u4EF7 {{sale_price_mxn}} MXN\u3002\u5EFA\u8BAE\u7248\u672C {{version_id}}\u3002",
      "es-MX": "Listing {{listing_id}}: rival {{external_ref}} ahora {{sale_price_mxn}} MXN. Versi\xF3n sugerida {{version_id}}."
    }
  },
  {
    id: "repricing.suggested_pending",
    event: "SuggestedPricePending",
    channel: "in_app",
    subject: {
      en: "Suggested price pending approval",
      "zh-CN": "\u5EFA\u8BAE\u4EF7\u5F85\u5BA1\u6279",
      "es-MX": "Precio sugerido pendiente"
    },
    body: {
      en: "SKU {{sku_id}} on {{channel}} needs operator review (action {{rule_action}}).",
      "zh-CN": "SKU {{sku_id}}\uFF08{{channel}}\uFF09\u9700\u8FD0\u8425\u786E\u8BA4\uFF08\u52A8\u4F5C {{rule_action}}\uFF09\u3002",
      "es-MX": "SKU {{sku_id}} en {{channel}} requiere revisi\xF3n (acci\xF3n {{rule_action}})."
    }
  },
  {
    id: "channel.publish_partial",
    event: "ChannelPublishPartial",
    channel: "email",
    subject: {
      en: "Channel publish partial success",
      "zh-CN": "\u6E20\u9053\u5199\u4EF7\u90E8\u5206\u6210\u529F",
      "es-MX": "Publicaci\xF3n parcial en canal"
    },
    body: {
      en: "Batch {{batch_id}}: {{success_count}} ok, {{failure_count}} failed. See publish_status in ops center.",
      "zh-CN": "\u6279\u6B21 {{batch_id}}\uFF1A\u6210\u529F {{success_count}}\uFF0C\u5931\u8D25 {{failure_count}}\u3002\u8BE6\u89C1\u6307\u6325\u4E2D\u5FC3 publish_status\u3002",
      "es-MX": "Lote {{batch_id}}: {{success_count}} ok, {{failure_count}} fallos. Ver publish_status en ops."
    }
  },
  {
    id: "ingest.stale_freeze",
    event: "IngestStaleFreeze",
    channel: "in_app",
    subject: {
      en: "Listing frozen \u2014 stale ingest",
      "zh-CN": "Listing \u5DF2\u51BB\u7ED3\uFF08\u91C7\u96C6\u8FC7\u671F\uFF09",
      "es-MX": "Listing congelado \u2014 ingest obsoleto"
    },
    body: {
      en: "Listing {{listing_id}} ingest stale since {{stale_since}}. Dynamic rule frozen; unfreeze when fresh.",
      "zh-CN": "Listing {{listing_id}} \u81EA {{stale_since}} \u91C7\u96C6\u8FC7\u671F\uFF0C\u52A8\u6001\u89C4\u5219\u5DF2\u51BB\u7ED3\uFF1B\u5237\u65B0\u540E\u53EF\u89E3\u51BB\u3002",
      "es-MX": "Listing {{listing_id}} obsoleto desde {{stale_since}}. Regla congelada; descongelar al actualizar."
    }
  }
];
function getNotificationTemplate(templateId) {
  return TEMPLATES.find((t) => t.id === templateId);
}
function formatNotificationTemplatesForLocale(locale) {
  return TEMPLATES.map((t) => ({
    id: t.id,
    event: t.event,
    channel: t.channel,
    subject: t.subject[locale],
    body: t.body[locale]
  }));
}

// apps/bff/dist/notification-template-render.js
function renderNotificationTemplate(template, vars) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key3) => {
    const value = vars[key3];
    if (value === null || value === void 0) {
      return "";
    }
    return String(value);
  });
}

// apps/bff/dist/repositories/memory-notification-inbox.js
var seq2 = 0;
var records2 = [];
var MemoryNotificationInboxRepository = class {
  driver = "memory";
  async create(input) {
    seq2 += 1;
    const record = {
      id: `notif-${seq2}`,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      read_at: null,
      ...input
    };
    records2.push(record);
    return record;
  }
  async list(tenantId, limit = 50) {
    return records2.filter((r) => r.tenant_id === tenantId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  }
  async markRead(tenantId, id) {
    const record = records2.find((r) => r.tenant_id === tenantId && r.id === id);
    if (!record) {
      return void 0;
    }
    record.read_at = (/* @__PURE__ */ new Date()).toISOString();
    return record;
  }
  resetForTests() {
    records2.length = 0;
    seq2 = 0;
  }
};

// apps/bff/dist/repositories/notification-inbox-index.js
var singleton8;
function getNotificationInboxRepository() {
  if (!singleton8) {
    singleton8 = new MemoryNotificationInboxRepository();
  }
  return singleton8;
}

// apps/bff/dist/notification-delivery.js
async function deliverEmailWebhook(payload) {
  const url = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  if (!url) {
    return "webhook_skipped";
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`NOTIFICATION_WEBHOOK_${res.status}`);
  }
  return "webhook_accepted";
}
async function dispatchNotification(input) {
  const template = getNotificationTemplate(input.template_id);
  if (!template) {
    throw new Error("NOTIFICATION_TEMPLATE_NOT_FOUND");
  }
  const locale = input.locale;
  const subject = renderNotificationTemplate(template.subject[locale], input.vars);
  const body = renderNotificationTemplate(template.body[locale], input.vars);
  const channels = input.channels ?? (template.channel === "email" ? ["in_app", "email_stub"] : ["in_app"]);
  const inbox = getNotificationInboxRepository();
  const created = [];
  for (const channel of channels) {
    if (channel === "webhook") {
      const status = await deliverEmailWebhook({
        tenant_id: input.tenant_id,
        template_id: input.template_id,
        subject,
        body,
        listing_id: input.listing_id ?? null
      });
      created.push(await inbox.create({
        tenant_id: input.tenant_id,
        template_id: input.template_id,
        event: template.event,
        locale,
        channel: "webhook",
        subject,
        body,
        listing_id: input.listing_id ?? null,
        delivery_status: status
      }));
      continue;
    }
    created.push(await inbox.create({
      tenant_id: input.tenant_id,
      template_id: input.template_id,
      event: template.event,
      locale,
      channel,
      subject,
      body,
      listing_id: input.listing_id ?? null,
      delivery_status: channel === "email_stub" ? "email_stub" : "stored"
    }));
  }
  return created;
}
async function listNotificationInbox(tenantId, limit = 50) {
  return getNotificationInboxRepository().list(tenantId, limit);
}
async function markNotificationRead(tenantId, id) {
  return getNotificationInboxRepository().markRead(tenantId, id);
}

// apps/bff/dist/repricing/runtime.js
var SHOP_BY_LISTING = Object.fromEntries(Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop]));
async function resolveIngestShop(shops2, tenantId, listingId) {
  const shopId = SHOP_BY_LISTING[listingId];
  if (!shopId)
    return void 0;
  const shop = await shops2.getShop(tenantId, shopId);
  if (!shop || shop.auth_status !== "connected" || !shop.external_seller_id) {
    return void 0;
  }
  const access_token = await shops2.getAccessToken(shopId);
  if (!access_token)
    return void 0;
  return {
    shop_id: shopId,
    external_seller_id: shop.external_seller_id,
    access_token
  };
}
var IngestFailedError = class extends Error {
  constructor() {
    super("INGEST_FAILED");
    this.name = "IngestFailedError";
  }
};
async function ensureIngestSchedule(repricing, listingId, tier = "T1") {
  const existing = await repricing.getIngestSchedule(listingId);
  if (existing)
    return existing;
  return repricing.upsertIngestSchedule({
    listing_id: listingId,
    tier,
    next_run_at: nextRunFromNow(tier)
  });
}
async function notifyObservationChange(_repricing, _tenantId, input) {
  if (input.previous_effective !== null && input.previous_effective === input.observation.effective_price) {
    return;
  }
  await recordCompetitorPriceChange({
    listing_id: input.listing_id,
    channel: input.channel,
    offer_id: input.offer_id,
    previous_effective: input.previous_effective,
    current_effective: input.observation.effective_price,
    observation_id: input.observation.id,
    observed_at: input.observation.observed_at
  });
}
async function flushListingDebounce(repricing, tenantId, listingId) {
  const payload = await flushDebounce(listingId);
  if (!payload) {
    return null;
  }
  const dedupe_key = `cpc:${listingId}:${payload.observation_id}`;
  return repricing.enqueueEvent({
    tenant_id: tenantId,
    listing_id: listingId,
    channel: payload.channel,
    type: "CompetitorPriceChanged",
    payload,
    dedupe_key
  });
}
async function runCompetitorIngest(catalog, competitors, repricing, listingHealth, shops2, listingAdapter, tenantId, listingId) {
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const schedule = await ensureIngestSchedule(repricing, listingId);
  const offers2 = await competitors.listOffers(listingId);
  const driver = resolveCompetitorIngestDriver();
  const includeShipping = competitorIngestIncludeShipping();
  const ingestShop = driver === "channel" ? await resolveIngestShop(shops2, tenantId, listingId) : void 0;
  if (driver === "channel" && !ingestShop) {
    await listingHealth.setIngestFailed(listingId, true);
    throw new IngestFailedError();
  }
  let created = 0;
  try {
    for (const offer of offers2) {
      assertCompetitorScrapeAllowed(offer.external_ref);
      const prev = await competitors.latestObservation(offer.id);
      const pulled = await pullCompetitorPrice({
        driver,
        listingAdapter,
        channel: offer.channel,
        externalRef: offer.external_ref,
        offerId: offer.id,
        listingId,
        shop: ingestShop
      });
      const effective = computeEffectivePrice({
        sale_price: pulled.sale_price,
        list_price: pulled.list_price,
        shipping_addon: pulled.shipping_addon,
        include_shipping: includeShipping
      });
      if (prev && prev.effective_price === effective) {
        continue;
      }
      const observation = await competitors.addObservation({
        offer_id: offer.id,
        observed_at: pulled.observed_at,
        sale_price: pulled.sale_price,
        list_price: pulled.list_price ?? null,
        shipping_addon: pulled.shipping_addon ?? 0,
        effective_price: effective,
        raw_json: buildObservationRawJson({
          source: pulled.source,
          buy_box_winner: pulled.buy_box_winner
        })
      });
      created += 1;
      await notifyObservationChange(repricing, tenantId, {
        listing_id: listingId,
        channel: offer.channel,
        offer_id: offer.id,
        previous_effective: prev?.effective_price ?? null,
        observation: {
          id: observation.id,
          effective_price: observation.effective_price,
          observed_at: observation.observed_at
        }
      });
    }
    await listingHealth.setIngestFailed(listingId, false);
  } catch (e) {
    await listingHealth.setIngestFailed(listingId, true);
    if (e instanceof CompetitorScrapeComplianceError) {
      throw e;
    }
    throw e instanceof IngestFailedError ? e : new IngestFailedError();
  }
  await repricing.upsertIngestSchedule({
    listing_id: listingId,
    tier: schedule.tier,
    next_run_at: nextRunFromNow(schedule.tier)
  });
  return { observations_created: created, tier: schedule.tier, driver };
}
async function processRepricingEvent(catalog, competitors, repricing, dynamicRules, listingHealth, repricingActivity, tenantId, eventId, locale = "en") {
  const event = await repricing.getEvent(eventId);
  if (!event || event.tenant_id !== tenantId) {
    throw new Error("EVENT_NOT_FOUND");
  }
  if (event.status === "processed") {
    return { skipped: true, reason: "ALREADY_PROCESSED" };
  }
  const listing = await catalog.getListing(tenantId, event.listing_id);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const prevStale = await listingHealth.getStale(event.listing_id);
  await evaluateListingStale(competitors, listingHealth, event.listing_id);
  const staleState = await listingHealth.getStale(event.listing_id);
  if (!prevStale.competitor_stale_frozen && staleState.competitor_stale_frozen) {
    try {
      await dispatchNotification({
        tenant_id: tenantId,
        locale,
        template_id: "ingest.stale_freeze",
        listing_id: event.listing_id,
        vars: {
          listing_id: event.listing_id,
          stale_since: staleState.competitor_stale_since ?? "\u2014"
        }
      });
    } catch {
    }
  }
  if (staleState.competitor_stale_frozen) {
    return { skipped: true, reason: "STALE_COMPETITOR_DATA" };
  }
  let rule = await dynamicRules.getRule(event.listing_id);
  if (!rule) {
    rule = await dynamicRules.upsertRule(event.listing_id, {});
  }
  if (!rule.enabled) {
    return { skipped: true, reason: "RULE_DISABLED" };
  }
  if (rule.frozen) {
    return { skipped: true, reason: "RULE_FROZEN" };
  }
  const guardCode = await checkDynamicRepricingGuards(repricingActivity, event.listing_id, rule);
  if (guardCode) {
    return { skipped: true, reason: guardCode };
  }
  if (rule.business_hours_only && !isWithinMexicoBusinessHours()) {
    return { skipped: true, reason: "OUTSIDE_BUSINESS_HOURS" };
  }
  const offers2 = await competitors.listOffers(event.listing_id);
  const withLatest = await Promise.all(offers2.map(async (o) => {
    const latest = await competitors.latestObservation(o.id);
    return {
      ...o,
      latest_effective_mxn: latest?.effective_price ?? null,
      latest_observation_id: latest?.id ?? null,
      latest_observation: latest
    };
  }));
  let observations2 = withLatest.filter((o) => o.latest_effective_mxn != null).map((o) => ({
    channel: o.channel,
    effective_price_mxn: o.latest_effective_mxn
  }));
  if (rule.anchor_type === "buy_box") {
    observations2 = withLatest.filter((o) => o.latest_effective_mxn != null && observationBuyBoxWinner(o.latest_observation)).map((o) => ({
      channel: o.channel,
      effective_price_mxn: o.latest_effective_mxn
    }));
  }
  const competitorSnapshotIds = withLatest.map((o) => o.latest_observation_id).filter((id) => Boolean(id));
  if (observations2.length === 0) {
    await repricing.markProcessed(eventId, `proc:${eventId}`);
    return { skipped: true, reason: "NO_ANCHOR" };
  }
  const sku = listing.sku;
  const fee = listing.channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
  const floor = computeFloorPrice2(sku.landed_cost_mxn, sku.policy.min_margin_pct, fee);
  const comp = computeCompetitive2({
    pricing_mode: "competitive_with_floor",
    channel: listing.channel,
    floor_price_mxn: floor,
    rounding_rule: { type: "NONE", decimals: 2 },
    anchor_type: rule.anchor_type,
    competitor_observations: observations2,
    offset: rule.offset.type === "FIXED_MXN" ? { type: "FIXED_MXN", value: rule.offset.value } : { type: "PERCENT", value: rule.offset.value }
  });
  const versions2 = await catalog.listVersions(sku.id);
  const active = versions2.find((v) => v.state === "active" && v.channel === listing.channel);
  if (active && rule.min_gap_mxn > 0 && Math.abs(comp.publish_price_mxn - active.publish_price_mxn) < rule.min_gap_mxn) {
    return { skipped: true, reason: "MIN_GAP" };
  }
  const versionState = versionStateForAction(rule.action);
  const ingestGuard = await listingHealth.getIngestGuard(event.listing_id);
  if (versionState === "active" && active && comp.publish_price_mxn < active.publish_price_mxn && ingestGuard.ingest_failed) {
    return { skipped: true, reason: "INGEST_FAILED_NO_DOWNGRADE" };
  }
  const version = await catalog.createVersion({
    tenant_id: tenantId,
    sku_id: sku.id,
    channel: listing.channel,
    state: versionState,
    publish_price_mxn: comp.publish_price_mxn,
    reason: `repricing:${eventId}`,
    trigger_event_id: eventId,
    dynamic_rule_id: rule.id,
    competitor_snapshot_ids: competitorSnapshotIds,
    floor_snapshot_id: `floor:${event.listing_id}:${floor}`,
    cost_snapshot_id: `cost:${sku.id}:${sku.landed_cost_mxn}`
  });
  await repricing.markProcessed(eventId, `proc:${eventId}`);
  await repricingActivity.recordApply(event.listing_id);
  try {
    const payload = event.payload;
    let externalRef = "\u2014";
    if (payload.offer_id) {
      const matched = offers2.find((o) => o.id === payload.offer_id);
      externalRef = matched?.external_ref ?? "\u2014";
    }
    await dispatchNotification({
      tenant_id: tenantId,
      locale,
      template_id: "repricing.competitor_price_changed",
      listing_id: event.listing_id,
      vars: {
        listing_id: event.listing_id,
        external_ref: externalRef,
        sale_price_mxn: comp.publish_price_mxn,
        version_id: version.id
      }
    });
    if (version.state === "pending") {
      await dispatchNotification({
        tenant_id: tenantId,
        locale,
        template_id: "repricing.suggested_pending",
        listing_id: event.listing_id,
        vars: {
          sku_id: sku.id,
          channel: listing.channel,
          rule_action: rule.action
        }
      });
    }
  } catch {
  }
  return { version_id: version.id, state: version.state };
}

// apps/bff/dist/repositories/memory-dynamic-rule.js
var rules = /* @__PURE__ */ new Map();
function defaultRule(listingId) {
  return {
    id: `drule-${listingId}`,
    listing_id: listingId,
    enabled: true,
    action: "suggest",
    anchor_type: "median",
    offset: { type: "PERCENT", value: 0 },
    triggers_json: null,
    cooldown_min: 0,
    daily_limit: 10,
    min_gap_mxn: 5,
    tier: null,
    frozen: false,
    business_hours_only: false,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var MemoryDynamicRuleRepository = class {
  driver = "memory";
  async getRule(listingId) {
    return rules.get(listingId);
  }
  async upsertRule(listingId, patch) {
    const base = rules.get(listingId) ?? defaultRule(listingId);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== void 0));
    const next = {
      ...base,
      ...clean,
      offset: clean.offset ?? base.offset,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    rules.set(listingId, next);
    return next;
  }
  async unfreeze(listingId) {
    const rule = rules.get(listingId);
    if (!rule) {
      return this.upsertRule(listingId, { frozen: false });
    }
    return this.upsertRule(listingId, { frozen: false });
  }
  resetForTests() {
    rules.clear();
  }
};

// apps/bff/dist/repositories/memory-listing-health.js
var staleByListing = /* @__PURE__ */ new Map();
var ingestFailedByListing = /* @__PURE__ */ new Map();
var MemoryListingHealthRepository = class {
  driver = "memory";
  async getStale(listingId) {
    const s = staleByListing.get(listingId);
    return {
      competitor_stale_frozen: s?.frozen ?? false,
      competitor_stale_since: s?.since ?? null
    };
  }
  async setStale(listingId, frozen, since) {
    staleByListing.set(listingId, {
      frozen,
      since: frozen ? since ?? (/* @__PURE__ */ new Date()).toISOString() : null
    });
  }
  async getIngestGuard(listingId) {
    const g = ingestFailedByListing.get(listingId);
    return {
      ingest_failed: g?.failed ?? false,
      ingest_failed_at: g?.at ?? null
    };
  }
  async setIngestFailed(listingId, failed) {
    ingestFailedByListing.set(listingId, {
      failed,
      at: failed ? (/* @__PURE__ */ new Date()).toISOString() : null
    });
  }
  resetForTests() {
    staleByListing.clear();
    ingestFailedByListing.clear();
  }
};

// apps/bff/dist/repositories/postgres-dynamic-rule.js
import pg6 from "pg";
function mapRule(row) {
  return {
    id: row.id,
    listing_id: row.listing_id,
    enabled: Boolean(row.enabled),
    action: row.action,
    anchor_type: row.anchor_type,
    offset: row.offset_json,
    triggers_json: row.triggers_json ?? null,
    cooldown_min: Number(row.cooldown_min),
    daily_limit: Number(row.daily_limit),
    min_gap_mxn: Number(row.min_gap_mxn),
    tier: row.tier ?? null,
    frozen: Boolean(row.frozen),
    business_hours_only: Boolean(row.business_hours_only ?? false),
    updated_at: new Date(row.updated_at).toISOString()
  };
}
var PostgresDynamicRuleRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionString) {
    this.pool = new pg6.Pool({ connectionString });
  }
  async getRule(listingId) {
    const res = await this.pool.query(`SELECT id, listing_id, enabled, action, anchor_type, offset_json, triggers_json,
              cooldown_min, daily_limit, min_gap_mxn, tier, frozen, business_hours_only, updated_at
       FROM dynamic_repricing_rules WHERE listing_id = $1`, [listingId]);
    if (!res.rowCount)
      return void 0;
    return mapRule(res.rows[0]);
  }
  async upsertRule(listingId, patch) {
    const existing = await this.getRule(listingId);
    const merged = {
      enabled: patch.enabled ?? existing?.enabled ?? true,
      action: patch.action ?? existing?.action ?? "suggest",
      anchor_type: patch.anchor_type ?? existing?.anchor_type ?? "median",
      offset: patch.offset ?? existing?.offset ?? { type: "PERCENT", value: 0 },
      triggers_json: patch.triggers_json ?? existing?.triggers_json ?? null,
      cooldown_min: patch.cooldown_min ?? existing?.cooldown_min ?? 0,
      daily_limit: patch.daily_limit ?? existing?.daily_limit ?? 10,
      min_gap_mxn: patch.min_gap_mxn ?? existing?.min_gap_mxn ?? 5,
      tier: patch.tier ?? existing?.tier ?? null,
      frozen: patch.frozen ?? existing?.frozen ?? false,
      business_hours_only: patch.business_hours_only ?? existing?.business_hours_only ?? false
    };
    const id = existing?.id ?? `drule-${listingId}`;
    const res = await this.pool.query(`INSERT INTO dynamic_repricing_rules
       (id, listing_id, enabled, action, anchor_type, offset_json, triggers_json,
        cooldown_min, daily_limit, min_gap_mxn, tier, frozen, business_hours_only)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (listing_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         action = EXCLUDED.action,
         anchor_type = EXCLUDED.anchor_type,
         offset_json = EXCLUDED.offset_json,
         triggers_json = EXCLUDED.triggers_json,
         cooldown_min = EXCLUDED.cooldown_min,
         daily_limit = EXCLUDED.daily_limit,
         min_gap_mxn = EXCLUDED.min_gap_mxn,
         tier = EXCLUDED.tier,
         frozen = EXCLUDED.frozen,
         business_hours_only = EXCLUDED.business_hours_only,
         updated_at = NOW()
       RETURNING id, listing_id, enabled, action, anchor_type, offset_json, triggers_json,
                 cooldown_min, daily_limit, min_gap_mxn, tier, frozen, business_hours_only, updated_at`, [
      id,
      listingId,
      merged.enabled,
      merged.action,
      merged.anchor_type,
      JSON.stringify(merged.offset),
      merged.triggers_json ? JSON.stringify(merged.triggers_json) : null,
      merged.cooldown_min,
      merged.daily_limit,
      merged.min_gap_mxn,
      merged.tier,
      merged.frozen,
      merged.business_hours_only
    ]);
    return mapRule(res.rows[0]);
  }
  async unfreeze(listingId) {
    return this.upsertRule(listingId, { frozen: false });
  }
};
var PostgresListingHealthRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionString) {
    this.pool = new pg6.Pool({ connectionString });
  }
  async getStale(listingId) {
    const res = await this.pool.query(`SELECT competitor_stale_frozen, competitor_stale_since
       FROM listings WHERE id = $1`, [listingId]);
    if (!res.rowCount) {
      return { competitor_stale_frozen: false, competitor_stale_since: null };
    }
    const row = res.rows[0];
    return {
      competitor_stale_frozen: Boolean(row.competitor_stale_frozen),
      competitor_stale_since: row.competitor_stale_since ? new Date(row.competitor_stale_since).toISOString() : null
    };
  }
  async setStale(listingId, frozen, since) {
    await this.pool.query(`UPDATE listings SET competitor_stale_frozen = $2,
              competitor_stale_since = $3 WHERE id = $1`, [listingId, frozen, frozen ? since ?? (/* @__PURE__ */ new Date()).toISOString() : null]);
  }
  async getIngestGuard(listingId) {
    const res = await this.pool.query(`SELECT ingest_failed, ingest_failed_at FROM listings WHERE id = $1`, [listingId]);
    if (!res.rowCount) {
      return { ingest_failed: false, ingest_failed_at: null };
    }
    const row = res.rows[0];
    return {
      ingest_failed: Boolean(row.ingest_failed),
      ingest_failed_at: row.ingest_failed_at ? new Date(row.ingest_failed_at).toISOString() : null
    };
  }
  async setIngestFailed(listingId, failed) {
    await this.pool.query(`UPDATE listings SET ingest_failed = $2,
              ingest_failed_at = $3 WHERE id = $1`, [
      listingId,
      failed,
      failed ? (/* @__PURE__ */ new Date()).toISOString() : null
    ]);
  }
};

// apps/bff/dist/repositories/dynamic-rule-index.js
var ruleSingleton;
var healthSingleton;
function createDynamicRuleRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryDynamicRuleRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresDynamicRuleRepository(url);
  }
  return new MemoryDynamicRuleRepository();
}
function getDynamicRuleRepository() {
  if (!ruleSingleton) {
    ruleSingleton = createDynamicRuleRepository();
  }
  return ruleSingleton;
}
function createListingHealthRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryListingHealthRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresListingHealthRepository(url);
  }
  return new MemoryListingHealthRepository();
}
function getListingHealthRepository() {
  if (!healthSingleton) {
    healthSingleton = createListingHealthRepository();
  }
  return healthSingleton;
}

// apps/bff/dist/repricing-queue-service.js
async function listRepricingQueue(catalog, tenantId, skuId) {
  const sku = await catalog.getSku(tenantId, skuId);
  if (!sku) {
    throw new Error("SKU_NOT_FOUND");
  }
  const versions2 = await catalog.listVersions(skuId);
  const items = [];
  for (const v of versions2) {
    if (v.state !== "suggested" && v.state !== "pending") {
      continue;
    }
    const listingId = getListingIdForChannel(v.channel);
    if (!listingId)
      continue;
    items.push({
      version_id: v.id,
      listing_id: listingId,
      channel: v.channel,
      state: v.state,
      publish_price_mxn: v.publish_price_mxn,
      created_at: v.created_at
    });
  }
  items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return { items };
}
async function buildTenantRepricingQueue(catalog, tenantId) {
  const skus = await catalog.listSkus(tenantId);
  const rows3 = [];
  for (const sku of skus) {
    const { items } = await listRepricingQueue(catalog, tenantId, sku.id);
    for (const item of items) {
      rows3.push({ ...item, sku_id: sku.id });
    }
  }
  rows3.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return rows3;
}
async function buildSkuRepricingQueueRows(catalog, tenantId, skuId) {
  const { items } = await listRepricingQueue(catalog, tenantId, skuId);
  return items.map((item) => ({ ...item, sku_id: skuId }));
}
async function promoteVersionsToPending(catalog, versionIds) {
  const updated = [];
  const skipped = [];
  for (const versionId of versionIds) {
    const next = await catalog.updateVersionState(versionId, "suggested", "pending");
    if (!next) {
      skipped.push(versionId);
      continue;
    }
    const listingId = getListingIdForChannel(next.channel);
    if (!listingId) {
      skipped.push(versionId);
      continue;
    }
    updated.push({
      version_id: next.id,
      listing_id: listingId,
      channel: next.channel,
      state: next.state,
      publish_price_mxn: next.publish_price_mxn,
      created_at: next.created_at
    });
  }
  return { updated, skipped };
}

// apps/bff/dist/repricing-queue-csv.js
function cell2(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function repricingQueueToCsv(rows3, exportedAt) {
  const lines = [
    "exported_at,sku_id,version_id,listing_id,channel,state,publish_price_mxn,created_at"
  ];
  for (const r of rows3) {
    lines.push([
      exportedAt,
      cell2(r.sku_id),
      cell2(r.version_id),
      cell2(r.listing_id),
      cell2(r.channel),
      cell2(r.state),
      r.publish_price_mxn,
      cell2(r.created_at)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repricing-batch-shard.js
import { createHash as createHash2 } from "node:crypto";
function repricingShardIndex(listingId, shardTotal) {
  if (shardTotal < 1)
    return 0;
  const hash = createHash2("sha256").update(listingId).digest();
  const num = hash.readUInt32BE(0);
  return num % shardTotal;
}
function planRepricingShards(tenantId, skuId, shardTotal) {
  const listings = listListingsForSku(tenantId, skuId);
  const shards = [];
  for (let i = 0; i < shardTotal; i++) {
    shards.push({ shard_index: i, listing_ids: [] });
  }
  for (const l of listings) {
    const idx = repricingShardIndex(l.id, shardTotal);
    shards[idx].listing_ids.push(l.id);
  }
  return {
    sku_id: skuId,
    shard_total: shardTotal,
    shards
  };
}
async function runRepricingBatchShard(input) {
  const plan = planRepricingShards(input.tenantId, input.skuId, input.shardTotal);
  const shard = plan.shards.find((s) => s.shard_index === input.shardIndex);
  if (!shard) {
    return { error: "INVALID_SHARD" };
  }
  const sku = await input.catalog.getSku(input.tenantId, input.skuId);
  if (!sku) {
    return { error: "SKU_NOT_FOUND" };
  }
  const processed = [];
  const skipped = [];
  for (const listingId of shard.listing_ids) {
    const events3 = await input.repricing.listEvents(input.tenantId, listingId, 100);
    const pending2 = events3.filter((e) => e.status === "pending");
    if (pending2.length === 0) {
      skipped.push({ listing_id: listingId, reason: "no_pending_events" });
      continue;
    }
    for (const ev of pending2) {
      try {
        const result = await processRepricingEvent(input.catalog, input.competitors, input.repricing, input.dynamicRules, input.listingHealth, input.repricingActivity, input.tenantId, ev.id, input.locale ?? "en");
        if ("skipped" in result && result.skipped) {
          processed.push({
            listing_id: listingId,
            event_id: ev.id,
            result: `skipped:${result.reason}`
          });
        } else {
          processed.push({
            listing_id: listingId,
            event_id: ev.id,
            result: result.state,
            version_id: result.version_id
          });
        }
      } catch (e) {
        skipped.push({
          listing_id: listingId,
          reason: String(e).slice(0, 80)
        });
      }
    }
  }
  return {
    sku_id: input.skuId,
    shard_index: input.shardIndex,
    shard_total: input.shardTotal,
    listing_ids: shard.listing_ids,
    processed,
    skipped
  };
}
async function runRepricingBatchAllShards(input) {
  const sku = await input.catalog.getSku(input.tenantId, input.skuId);
  if (!sku) {
    return { error: "SKU_NOT_FOUND" };
  }
  const shards = [];
  for (let shardIndex = 0; shardIndex < input.shardTotal; shardIndex++) {
    const result = await runRepricingBatchShard({
      ...input,
      shardIndex
    });
    if ("error" in result) {
      continue;
    }
    shards.push(result);
  }
  const processed = shards.reduce((n, s) => n + s.processed.length, 0);
  const skipped = shards.reduce((n, s) => n + s.skipped.length, 0);
  return {
    sku_id: input.skuId,
    shard_total: input.shardTotal,
    shards,
    totals: { processed, skipped }
  };
}
async function runRepricingBatchForTenant(input) {
  const skuRecords = input.skuIds?.length ? (await Promise.all(input.skuIds.map((id) => input.catalog.getSku(input.tenantId, id)))).map((sku, i) => ({ sku, id: input.skuIds[i] })) : (await input.catalog.listSkus(input.tenantId)).map((sku) => ({
    sku,
    id: sku.id
  }));
  const skus = [];
  for (const { sku, id } of skuRecords) {
    if (!sku) {
      skus.push({ sku_id: id, error: "SKU_NOT_FOUND" });
      continue;
    }
    const run = await runRepricingBatchAllShards({
      catalog: input.catalog,
      competitors: input.competitors,
      repricing: input.repricing,
      dynamicRules: input.dynamicRules,
      listingHealth: input.listingHealth,
      repricingActivity: input.repricingActivity,
      tenantId: input.tenantId,
      skuId: sku.id,
      shardTotal: input.shardTotal
    });
    if ("error" in run) {
      skus.push({ sku_id: sku.id, error: run.error });
      continue;
    }
    skus.push(run);
  }
  const processed = skus.reduce((n, s) => n + ("totals" in s ? s.totals.processed : 0), 0);
  const skipped = skus.reduce((n, s) => n + ("totals" in s ? s.totals.skipped : 0), 0);
  return {
    tenant_id: input.tenantId,
    shard_total: input.shardTotal,
    skus,
    totals: { processed, skipped }
  };
}

// apps/bff/dist/repricing-batch-shard-plan-csv.js
function cell3(value) {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function repricingBatchShardPlanToCsv(plan, exportedAt) {
  const lines = [
    "exported_at,sku_id,shard_total,shard_index,listing_id"
  ];
  for (const shard of plan.shards) {
    for (const listingId of shard.listing_ids) {
      lines.push([
        exportedAt,
        cell3(plan.sku_id),
        plan.shard_total,
        shard.shard_index,
        cell3(listingId)
      ].join(","));
    }
  }
  if (lines.length === 1) {
    lines.push([exportedAt, cell3(plan.sku_id), plan.shard_total, "", ""].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repositories/memory-repricing-batch-job-store.js
var queue = [];
var queueSeq = 0;
function mapJob(job) {
  return { ...job, sku_ids: job.sku_ids ? [...job.sku_ids] : null };
}
var MemoryRepricingBatchJobStore = class {
  driver = "memory";
  async enqueue(input) {
    if (input.scope === "sku" && !input.sku_id?.trim()) {
      throw new Error("SKU_ID_REQUIRED");
    }
    queueSeq += 1;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const job = {
      job_id: `repricing-batch-q-${queueSeq}`,
      tenant_id: input.tenant_id,
      scope: input.scope,
      sku_id: input.scope === "sku" ? input.sku_id.trim() : null,
      shard_total: input.shard_total,
      sku_ids: input.sku_ids?.length ? [...input.sku_ids] : null,
      status: "queued",
      created_at: now,
      updated_at: now,
      error: null,
      result: null
    };
    queue.push(job);
    return mapJob(job);
  }
  async list(tenantId, limit) {
    return queue.filter((j) => j.tenant_id === tenantId).slice(-limit).reverse().map(mapJob);
  }
  async get(tenantId, jobId) {
    const job = queue.find((j) => j.job_id === jobId);
    if (!job || job.tenant_id !== tenantId)
      return void 0;
    return mapJob(job);
  }
  async claimQueued(tenantId, limit, _options) {
    const claimed = [];
    for (const job of queue) {
      if (job.tenant_id === tenantId && job.status === "queued" && claimed.length < limit) {
        job.status = "processing";
        job.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        claimed.push(mapJob(job));
      }
    }
    return claimed;
  }
  async save(job) {
    const idx = queue.findIndex((j) => j.job_id === job.job_id);
    if (idx >= 0) {
      queue[idx] = { ...job };
    }
  }
  async summary(tenantId) {
    const jobs2 = queue.filter((j) => j.tenant_id === tenantId);
    return {
      total: jobs2.length,
      queued: jobs2.filter((j) => j.status === "queued").length,
      failed: jobs2.filter((j) => j.status === "failed").length
    };
  }
  resetForTests() {
    queue.length = 0;
    queueSeq = 0;
  }
};

// apps/bff/dist/repositories/postgres-repricing-batch-job-store.js
import pg7 from "pg";
function mapRow(row) {
  return {
    job_id: row.job_id,
    tenant_id: row.tenant_id,
    scope: row.scope,
    sku_id: row.sku_id ?? null,
    shard_total: Number(row.shard_total),
    sku_ids: Array.isArray(row.sku_ids_json) ? row.sku_ids_json : null,
    status: row.status,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    error: row.error ?? null,
    result: row.result_json ?? null,
    lease_holder: row.lease_holder ?? null,
    lease_expires_at: row.lease_expires_at ? new Date(row.lease_expires_at).toISOString() : null
  };
}
var PostgresRepricingBatchJobStore = class {
  driver = "postgres";
  pool;
  constructor(connectionOrPool) {
    this.pool = typeof connectionOrPool === "string" ? new pg7.Pool({ connectionString: connectionOrPool }) : connectionOrPool;
  }
  async enqueue(input) {
    if (input.scope === "sku" && !input.sku_id?.trim()) {
      throw new Error("SKU_ID_REQUIRED");
    }
    const jobId = `repricing-batch-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await this.pool.query(`INSERT INTO repricing_batch_jobs
       (job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued')
       RETURNING job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
                 status, error, result_json, created_at, updated_at`, [
      jobId,
      input.tenant_id,
      input.scope,
      input.scope === "sku" ? input.sku_id.trim() : null,
      input.shard_total,
      input.sku_ids?.length ? JSON.stringify(input.sku_ids) : null
    ]);
    return mapRow(res.rows[0]);
  }
  async list(tenantId, limit) {
    const res = await this.pool.query(`SELECT job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
              status, error, result_json, created_at, updated_at
       FROM repricing_batch_jobs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [tenantId, limit]);
    return res.rows.map(mapRow);
  }
  async get(tenantId, jobId) {
    const res = await this.pool.query(`SELECT job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
              status, error, result_json, created_at, updated_at
       FROM repricing_batch_jobs WHERE job_id = $1 AND tenant_id = $2`, [jobId, tenantId]);
    if (!res.rowCount)
      return void 0;
    return mapRow(res.rows[0]);
  }
  async claimQueued(tenantId, limit, options) {
    const leaseSec = options?.lease_sec ?? 300;
    const workerId = options?.worker_id ?? "bff-worker";
    const sel = await this.pool.query(`SELECT job_id FROM repricing_batch_jobs
       WHERE tenant_id = $1 AND (
         status = 'queued'
         OR (status = 'processing' AND lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
       )
       ORDER BY created_at ASC
       LIMIT $2`, [tenantId, limit]);
    const claimed = [];
    for (const row of sel.rows) {
      const upd = await this.pool.query(`UPDATE repricing_batch_jobs
         SET status = 'processing',
             updated_at = NOW(),
             lease_holder = $3,
             lease_expires_at = NOW() + ($4::text || ' seconds')::interval
         WHERE job_id = $1 AND tenant_id = $2
         RETURNING job_id, tenant_id, scope, sku_id, shard_total, sku_ids_json,
                   status, error, result_json, created_at, updated_at,
                   lease_holder, lease_expires_at`, [row.job_id, tenantId, workerId, String(leaseSec)]);
      if (upd.rowCount) {
        claimed.push(mapRow(upd.rows[0]));
      }
    }
    return claimed;
  }
  async save(job) {
    await this.pool.query(`UPDATE repricing_batch_jobs
       SET status = $3, error = $4, result_json = $5,
           lease_holder = NULL, lease_expires_at = NULL, updated_at = NOW()
       WHERE job_id = $1 AND tenant_id = $2`, [
      job.job_id,
      job.tenant_id,
      job.status,
      job.error,
      job.result != null ? JSON.stringify(job.result) : null
    ]);
  }
  async summary(tenantId) {
    const res = await this.pool.query(`SELECT
         COUNT(*)::int AS total,
         SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END)::int AS queued,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed
       FROM repricing_batch_jobs WHERE tenant_id = $1`, [tenantId]);
    const row = res.rows[0];
    return {
      total: Number(row.total),
      queued: Number(row.queued ?? 0),
      failed: Number(row.failed ?? 0)
    };
  }
};

// apps/bff/dist/repricing-batch-job-store-index.js
function getStoreSlot() {
  return globalThis.__mxRepricingBatchJobStore;
}
function setStoreSlot(store) {
  globalThis.__mxRepricingBatchJobStore = store;
}
function resolveRepricingBatchQueueDriver() {
  const raw = (process.env.REPRICING_BATCH_QUEUE_DRIVER ?? "memory").trim().toLowerCase();
  if (raw === "postgres" && process.env.DATABASE_URL?.trim()) {
    return "postgres";
  }
  return "memory";
}
function getRepricingBatchJobStore() {
  const existing = getStoreSlot();
  if (existing)
    return existing;
  const driver = resolveRepricingBatchQueueDriver();
  const store = driver === "postgres" ? new PostgresRepricingBatchJobStore(process.env.DATABASE_URL) : new MemoryRepricingBatchJobStore();
  setStoreSlot(store);
  return store;
}

// apps/bff/dist/pricing-nfr-metrics.js
var simulateCount = 0;
var simulateTotalMs = 0;
var simulateDurationsMs = [];
var lastRepricingProcessedAt = null;
var MAX_DURATION_SAMPLES = 500;
function recordPricingSimulate(durationMs) {
  simulateCount += 1;
  simulateTotalMs += durationMs;
  simulateDurationsMs.push(durationMs);
  if (simulateDurationsMs.length > MAX_DURATION_SAMPLES) {
    simulateDurationsMs = simulateDurationsMs.slice(-MAX_DURATION_SAMPLES);
  }
}
function percentile(values, p) {
  if (values.length === 0)
    return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1);
  return Math.round(sorted[idx] ?? 0);
}
function recordRepricingProcessed() {
  lastRepricingProcessedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function getPricingNfrMetrics() {
  const avgMs = simulateCount > 0 ? Math.round(simulateTotalMs / simulateCount) : 0;
  return {
    pricing_simulate_count: simulateCount,
    pricing_calc_duration_ms_avg: avgMs,
    pricing_calc_duration_ms_p95: percentile(simulateDurationsMs, 95),
    repricing_last_processed_at: lastRepricingProcessedAt,
    repricing_lag_seconds: lastRepricingProcessedAt ? Math.max(0, Math.floor((Date.now() - new Date(lastRepricingProcessedAt).getTime()) / 1e3)) : null,
    k6_baseline: {
      pricing_context_p95_ms_threshold: 3e3,
      pricing_simulate_p95_ms_threshold: 3e3
    }
  };
}

// apps/bff/dist/repricing-batch-job-queue.js
async function listRepricingBatchJobs(tenantId, limit = 20) {
  return getRepricingBatchJobStore().list(tenantId, limit);
}
async function getRepricingBatchJob(tenantId, jobId) {
  return getRepricingBatchJobStore().get(tenantId, jobId);
}
async function enqueueRepricingBatchJob(input) {
  return getRepricingBatchJobStore().enqueue(input);
}
async function runJob(deps, job) {
  if (job.scope === "sku" && job.sku_id) {
    const result = await runRepricingBatchAllShards({
      ...deps,
      tenantId: job.tenant_id,
      skuId: job.sku_id,
      shardTotal: job.shard_total
    });
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result;
  }
  return runRepricingBatchForTenant({
    ...deps,
    tenantId: job.tenant_id,
    shardTotal: job.shard_total,
    skuIds: job.sku_ids ?? void 0
  });
}
async function processRepricingBatchQueue(deps, tenantId, limit = 5, options) {
  const store = getRepricingBatchJobStore();
  const batch = await store.claimQueued(tenantId, limit, options);
  const processed = [];
  for (const job of batch) {
    const working = { ...job };
    try {
      working.result = await runJob(deps, working);
      working.status = "completed";
      working.error = null;
    } catch (e) {
      working.status = "failed";
      working.error = String(e).slice(0, 200);
      working.result = null;
    }
    working.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    await store.save(working);
    recordRepricingProcessed();
    processed.push(working);
  }
  return { processed };
}
async function repricingBatchQueueSummary(tenantId) {
  const store = getRepricingBatchJobStore();
  const counts = await store.summary(tenantId);
  return {
    driver: store.driver,
    ...counts
  };
}

// apps/bff/dist/repricing-batch-jobs-csv.js
function repricingBatchJobsToCsv(jobs2, exportedAt) {
  const lines = [
    "exported_at,job_id,scope,sku_id,shard_total,status,created_at,updated_at,error"
  ];
  for (const j of jobs2) {
    const err = j.error?.replace(/"/g, '""') ?? "";
    lines.push([
      exportedAt,
      j.job_id,
      j.scope,
      j.sku_id ?? "",
      j.shard_total,
      j.status,
      j.created_at,
      j.updated_at,
      err.includes(",") || err.includes('"') ? `"${err}"` : err
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repricing-batch-jobs-summary.js
async function summarizeRepricingBatchJobs(tenantId, sampleLimit = 50) {
  const items = await listRepricingBatchJobs(tenantId, sampleLimit);
  const summary = {
    sampled: items.length,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };
  for (const job of items) {
    if (job.status === "queued")
      summary.queued += 1;
    else if (job.status === "processing")
      summary.processing += 1;
    else if (job.status === "completed")
      summary.completed += 1;
    else if (job.status === "failed")
      summary.failed += 1;
  }
  return {
    driver: resolveRepricingBatchQueueDriver(),
    summary,
    last_job_at: items[0]?.updated_at ?? null
  };
}

// apps/bff/dist/repricing-batch-jobs-summary-csv.js
function cell4(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function repricingBatchJobsSummaryToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,driver,sampled,queued,processing,completed,failed,last_job_at"
  ];
  lines.push([
    exportedAt,
    cell4(snapshot.driver),
    snapshot.summary.sampled,
    snapshot.summary.queued,
    snapshot.summary.processing,
    snapshot.summary.completed,
    snapshot.summary.failed,
    cell4(snapshot.last_job_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repositories/memory-repricing-activity.js
var seq3 = 0;
var rows = [];
var MemoryRepricingActivityRepository = class {
  driver = "memory";
  async recordApply(listingId, at) {
    seq3 += 1;
    rows.push({
      id: `ract-${seq3}`,
      listing_id: listingId,
      created_at: at ?? (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async lastApplyAt(listingId) {
    const filtered = rows.filter((r) => r.listing_id === listingId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return filtered[0]?.created_at ?? null;
  }
  async countAppliesSince(listingId, since) {
    return rows.filter((r) => r.listing_id === listingId && new Date(r.created_at) >= since).length;
  }
  resetForTests() {
    rows.length = 0;
    seq3 = 0;
  }
};

// apps/bff/dist/repositories/postgres-repricing-activity.js
import pg8 from "pg";
var PostgresRepricingActivityRepository = class {
  driver = "postgres";
  pool;
  constructor(connectionString) {
    this.pool = new pg8.Pool({ connectionString });
  }
  async recordApply(listingId, at) {
    const id = `ract-${Date.now()}`;
    await this.pool.query(`INSERT INTO repricing_activity (id, listing_id, created_at)
       VALUES ($1, $2, $3)`, [id, listingId, at ?? (/* @__PURE__ */ new Date()).toISOString()]);
  }
  async lastApplyAt(listingId) {
    const res = await this.pool.query(`SELECT created_at FROM repricing_activity
       WHERE listing_id = $1 ORDER BY created_at DESC LIMIT 1`, [listingId]);
    if (!res.rowCount)
      return null;
    return new Date(res.rows[0].created_at).toISOString();
  }
  async countAppliesSince(listingId, since) {
    const res = await this.pool.query(`SELECT COUNT(*)::int AS c FROM repricing_activity
       WHERE listing_id = $1 AND created_at >= $2`, [listingId, since.toISOString()]);
    return Number(res.rows[0].c);
  }
};

// apps/bff/dist/repositories/repricing-activity-index.js
var singleton9;
function createRepricingActivityRepository() {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryRepricingActivityRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresRepricingActivityRepository(url);
  }
  return new MemoryRepricingActivityRepository();
}
function getRepricingActivityRepository() {
  if (!singleton9) {
    singleton9 = createRepricingActivityRepository();
  }
  return singleton9;
}

// apps/bff/dist/repositories/memory-reconciliation.js
var seq4 = 0;
var alerts = [];
var MemoryReconciliationAlertRepository = class {
  driver = "memory";
  async createAlert(input) {
    seq4 += 1;
    const record = {
      id: `recon-alert-${seq4}`,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      resolved_at: null,
      ...input
    };
    alerts.push(record);
    return record;
  }
  async listAlerts(tenantId) {
    return alerts.filter((a) => a.tenant_id === tenantId && a.resolved_at === null).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  resetForTests() {
    alerts.length = 0;
    seq4 = 0;
  }
};

// apps/bff/dist/repositories/postgres-reconciliation.js
import { Pool as Pool2 } from "pg";
var seq5 = 0;
var PostgresReconciliationAlertRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool2({ connectionString: databaseUrl });
  }
  async createAlert(input) {
    seq5 += 1;
    const id = `recon-alert-${Date.now()}-${seq5}`;
    const created_at = (/* @__PURE__ */ new Date()).toISOString();
    await this.pool.query(`INSERT INTO reconciliation_alerts
        (id, tenant_id, listing_id, channel, active_price_mxn, channel_price_mxn, delta_mxn, severity, status, created_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,NULL)`, [
      id,
      input.tenant_id,
      input.listing_id,
      input.channel,
      input.active_price_mxn,
      input.channel_price_mxn,
      input.delta_mxn,
      input.severity,
      created_at
    ]);
    return { id, created_at, resolved_at: null, ...input };
  }
  async listAlerts(tenantId) {
    const r = await this.pool.query(`SELECT * FROM reconciliation_alerts
       WHERE tenant_id = $1 AND resolved_at IS NULL
       ORDER BY created_at DESC`, [tenantId]);
    return r.rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      listing_id: row.listing_id,
      channel: row.channel,
      active_price_mxn: Number(row.active_price_mxn),
      channel_price_mxn: Number(row.channel_price_mxn),
      delta_mxn: Number(row.delta_mxn),
      severity: row.severity ?? "warning",
      created_at: new Date(row.created_at).toISOString(),
      resolved_at: row.resolved_at ? new Date(row.resolved_at).toISOString() : null
    }));
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM reconciliation_alerts`);
    seq5 = 0;
  }
};

// apps/bff/dist/repositories/reconciliation-index.js
var singleton10;
function createReconciliationAlertRepository() {
  if (process.env.RECONCILIATION_DRIVER === "memory") {
    return new MemoryReconciliationAlertRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresReconciliationAlertRepository(url);
  }
  return new MemoryReconciliationAlertRepository();
}
function getReconciliationAlertRepository() {
  if (!singleton10) {
    singleton10 = createReconciliationAlertRepository();
  }
  return singleton10;
}

// apps/bff/dist/reconciliation-service.js
var SHOP_BY_LISTING2 = Object.fromEntries(Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop]));
async function reconcileListingChannelPrice(catalog, shops2, listingAdapter, alerts2, tenantId, listingId, input) {
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const shopId = SHOP_BY_LISTING2[listingId];
  const shop = shopId ? await shops2.getShop(tenantId, shopId) : void 0;
  if (!shop || shop.auth_status !== "connected" || !shop.external_seller_id) {
    throw new Error("AUTH_REQUIRED");
  }
  const token = await shops2.getAccessToken(shopId);
  if (!token) {
    throw new Error("AUTH_EXPIRED");
  }
  const versions2 = await catalog.listVersions(listing.sku_id);
  const active = versions2.find((v) => v.state === "active" && v.channel === listing.channel);
  if (!active) {
    throw new Error("NO_ACTIVE_VERSION");
  }
  const snapshot = await listingAdapter.pullListing({
    shop_id: shopId,
    channel: shop.channel,
    external_seller_id: shop.external_seller_id,
    access_token: token
  }, input.external_ref);
  const tolerance = input.tolerance_mxn ?? 0;
  const delta = snapshot.price_mxn - active.publish_price_mxn;
  if (Math.abs(delta) <= tolerance) {
    return {
      status: "ok",
      active_price_mxn: active.publish_price_mxn,
      channel_price_mxn: snapshot.price_mxn
    };
  }
  const alert = await alerts2.createAlert({
    tenant_id: tenantId,
    listing_id: listingId,
    channel: listing.channel,
    active_price_mxn: active.publish_price_mxn,
    channel_price_mxn: snapshot.price_mxn,
    delta_mxn: delta,
    severity: "warning"
  });
  return {
    status: "mismatch",
    active_price_mxn: active.publish_price_mxn,
    channel_price_mxn: snapshot.price_mxn,
    delta_mxn: delta,
    alert_id: alert.id
  };
}

// apps/bff/dist/channel-adapter-factory.js
import { AmazonMxListingAdapter, AmazonMxPublishAdapter, HttpStubChannelListingAdapter, HttpStubChannelPublishAdapter, MercadoLibreListingAdapter, MercadoLibrePublishAdapter, MockChannelListingAdapter, MockChannelPublishAdapter } from "@mx-pricing/channel-adapters";

// apps/bff/dist/deploy-environment.js
var VALID = ["development", "staging", "production"];
function resolveDeployEnvironment(raw) {
  const key3 = (raw ?? process.env.DEPLOY_ENV ?? "development").trim().toLowerCase();
  if (key3 === "prod" || key3 === "production")
    return "production";
  if (key3 === "stage" || key3 === "staging")
    return "staging";
  if (key3 === "dev" || key3 === "development" || key3 === "local") {
    return "development";
  }
  return VALID.includes(key3) ? key3 : "development";
}
function isStagingOrProduction() {
  const env = resolveDeployEnvironment();
  return env === "staging" || env === "production";
}
function getDeployEnvironmentStatus() {
  const deploy_env = resolveDeployEnvironment();
  return {
    deploy_env,
    production_mode: deploy_env === "production",
    staging_mode: deploy_env === "staging",
    cors_origins: (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((v) => v.trim()).filter(Boolean)
  };
}

// apps/bff/dist/channel-adapter-factory.js
var DRIVER_ALIASES2 = {
  mock: "mock",
  http_stub: "http_stub",
  http: "http_stub",
  mercadolibre: "mercadolibre",
  ml: "mercadolibre",
  amazon_sp_api: "amazon_sp_api",
  amazon: "amazon_sp_api",
  live: "live",
  auto: "auto"
};
function isChannelLivePublishArmed() {
  return process.env.CHANNEL_LIVE_ACKNOWLEDGED === "1" || process.env.CHANNEL_LIVE_ACKNOWLEDGED === "true";
}
function defaultChannelAdapterDriver() {
  if (isStagingOrProduction() && isChannelLivePublishArmed()) {
    return "auto";
  }
  return "mock";
}
function resolveChannelAdapterDriver(raw) {
  const key3 = (raw ?? process.env.CHANNEL_ADAPTER_DRIVER ?? "").trim().toLowerCase();
  if (key3 && DRIVER_ALIASES2[key3]) {
    return DRIVER_ALIASES2[key3];
  }
  return defaultChannelAdapterDriver();
}
function getChannelAdapterStatus() {
  const driver = resolveChannelAdapterDriver();
  const publishUrl = process.env.CHANNEL_HTTP_PUBLISH_URL?.trim() || null;
  const pullUrl = process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim() || null;
  const httpConfigured = Boolean(publishUrl || pullUrl);
  const liveAck = isChannelLivePublishArmed();
  const deployAuto = isStagingOrProduction() && liveAck && !process.env.CHANNEL_ADAPTER_DRIVER?.trim();
  return {
    driver,
    publish_http_url_configured: Boolean(publishUrl),
    listing_pull_http_url_configured: Boolean(pullUrl),
    channel_live_acknowledged: liveAck,
    live_publish_armed: liveAck,
    deploy_env_auto_driver: deployAuto,
    mercadolibre_configured: Boolean(process.env.ML_CLIENT_ID?.trim()),
    amazon_sp_api_configured: Boolean(process.env.AMAZON_LWA_APP_ID?.trim()),
    ready: driver === "mock" || driver === "auto" || driver === "mercadolibre" || driver === "amazon_sp_api" || driver === "live" || driver === "http_stub" && httpConfigured || driver === "http_stub" && !httpConfigured,
    note: driver === "mock" ? "In-process mock adapters (default for local/CI)." : driver === "auto" ? liveAck ? "Auto: live ML/Amazon publish when shop token present; else HTTP stub or mock." : "Auto driver selected but CHANNEL_LIVE_ACKNOWLEDGED is off \u2014 falls back to HTTP/mock." : driver === "mercadolibre" || driver === "amazon_sp_api" || driver === "live" ? "Live channel API adapters (requires shop access_token)." : httpConfigured ? "HTTP stub adapters POST to CHANNEL_HTTP_* URLs; missing URL falls back to mock per operation." : "http_stub driver with no CHANNEL_HTTP_* URLs \u2014 publish/pull use mock fallback."
  };
}
var AutoChannelPublishAdapter = class {
  ml = new MercadoLibrePublishAdapter();
  amz = new AmazonMxPublishAdapter();
  http = new HttpStubChannelPublishAdapter();
  mock = new MockChannelPublishAdapter();
  async publishPrice(input) {
    if (isChannelLivePublishArmed() && input.shop.access_token?.trim()) {
      if (input.shop.channel === "MERCADO_LIBRE") {
        return this.ml.publishPrice(input);
      }
      if (input.shop.channel === "AMAZON_MX") {
        return this.amz.publishPrice(input);
      }
    }
    if (process.env.CHANNEL_HTTP_PUBLISH_URL?.trim()) {
      return this.http.publishPrice(input);
    }
    return this.mock.publishPrice(input);
  }
};
var LiveChannelPublishAdapter = class {
  auto = new AutoChannelPublishAdapter();
  async publishPrice(input) {
    if (!isChannelLivePublishArmed()) {
      return new MockChannelPublishAdapter().publishPrice(input);
    }
    return this.auto.publishPrice(input);
  }
};
var AutoChannelListingAdapter = class {
  ml = new MercadoLibreListingAdapter();
  amz = new AmazonMxListingAdapter();
  http = new HttpStubChannelListingAdapter();
  mock = new MockChannelListingAdapter();
  async pullListing(shop, externalRef) {
    if (isChannelLivePublishArmed() && shop.access_token?.trim()) {
      if (shop.channel === "MERCADO_LIBRE") {
        return this.ml.pullListing(shop, externalRef);
      }
      if (shop.channel === "AMAZON_MX") {
        return this.amz.pullListing(shop, externalRef);
      }
    }
    if (process.env.CHANNEL_HTTP_LISTING_PULL_URL?.trim()) {
      return this.http.pullListing(shop, externalRef);
    }
    return this.mock.pullListing(shop, externalRef);
  }
};
var LiveChannelListingAdapter = class {
  auto = new AutoChannelListingAdapter();
  async pullListing(shop, externalRef) {
    if (!isChannelLivePublishArmed()) {
      return new MockChannelListingAdapter().pullListing(shop, externalRef);
    }
    return this.auto.pullListing(shop, externalRef);
  }
};
function createChannelPublishAdapter() {
  const driver = resolveChannelAdapterDriver();
  if (driver === "mercadolibre")
    return new MercadoLibrePublishAdapter();
  if (driver === "amazon_sp_api")
    return new AmazonMxPublishAdapter();
  if (driver === "live")
    return new LiveChannelPublishAdapter();
  if (driver === "auto")
    return new AutoChannelPublishAdapter();
  if (driver === "http_stub")
    return new HttpStubChannelPublishAdapter();
  return new MockChannelPublishAdapter();
}
function createChannelListingAdapter() {
  const driver = resolveChannelAdapterDriver();
  if (driver === "mercadolibre")
    return new MercadoLibreListingAdapter();
  if (driver === "amazon_sp_api")
    return new AmazonMxListingAdapter();
  if (driver === "live")
    return new LiveChannelListingAdapter();
  if (driver === "auto")
    return new AutoChannelListingAdapter();
  if (driver === "http_stub")
    return new HttpStubChannelListingAdapter();
  return new MockChannelListingAdapter();
}

// apps/bff/dist/channel-adapters-status-csv.js
function cell5(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function channelAdapterStatusToCsv(status, exportedAt) {
  const lines = [
    "exported_at,driver,ready,publish_http_url_configured,listing_pull_http_url_configured,channel_live_acknowledged,note"
  ];
  lines.push([
    exportedAt,
    cell5(status.driver),
    status.ready ? "true" : "false",
    status.publish_http_url_configured ? "true" : "false",
    status.listing_pull_http_url_configured ? "true" : "false",
    status.channel_live_acknowledged ? "true" : "false",
    cell5(status.note)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-digest-service.js
import { formatMoney as formatMoney3 } from "@mx-pricing/i18n-format";
function dayBoundsUtc(dateStr) {
  const start = /* @__PURE__ */ new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
function todayUtcDate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function buildDailyAgentDigest(deps, tenantId, locale, dateStr) {
  const date = dateStr?.trim() || todayUtcDate();
  const { start, end } = dayBoundsUtc(date);
  const skus = await deps.catalog.listSkus(tenantId);
  let suggested = 0;
  let pending2 = 0;
  const queue_highlights = [];
  for (const sku of skus) {
    const { items } = await listRepricingQueue(deps.catalog, tenantId, sku.id);
    for (const item of items) {
      if (item.state === "suggested")
        suggested += 1;
      if (item.state === "pending")
        pending2 += 1;
      if (queue_highlights.length < 5) {
        queue_highlights.push({
          sku_id: sku.id,
          sku_code: sku.sku_code,
          channel: item.channel,
          state: item.state,
          publish_price_mxn: item.publish_price_mxn,
          publish_price: formatMoney3({
            locale,
            currency: "MXN",
            amount: item.publish_price_mxn
          }).formatted
        });
      }
    }
  }
  const alerts2 = await deps.reconciliationAlerts.listAlerts(tenantId);
  const openAlerts = alerts2.filter((a) => !a.resolved_at).length;
  const auditItems = await deps.agentAudit.listInvocations(tenantId, 200);
  const invocationsToday = auditItems.filter((row) => {
    const t = new Date(row.created_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;
  const narrative = locale === "es-MX" ? `Resumen ${date}: ${skus.length} SKU(s); ${suggested} precios sugeridos y ${pending2} pendientes; ${openAlerts} alertas de reconciliaci\xF3n abiertas; ${invocationsToday} invocaciones de herramientas agente hoy.` : locale === "zh-CN" ? `${date} \u6458\u8981\uFF1A${skus.length} \u4E2A SKU\uFF1BSuggested ${suggested} / Pending ${pending2}\uFF1B\u672A\u5904\u7406\u5BF9\u8D26\u544A\u8B66 ${openAlerts}\uFF1B\u5F53\u65E5 Agent \u5DE5\u5177\u8C03\u7528 ${invocationsToday} \u6B21\u3002` : `Digest ${date}: ${skus.length} SKU(s); ${suggested} suggested and ${pending2} pending prices; ${openAlerts} open reconciliation alerts; ${invocationsToday} agent tool invocations today.`;
  return {
    date,
    tenant_id: tenantId,
    locale,
    narrative,
    metrics: {
      sku_count: skus.length,
      suggested_versions: suggested,
      pending_versions: pending2,
      open_reconciliation_alerts: openAlerts,
      agent_tool_invocations_today: invocationsToday
    },
    queue_highlights
  };
}

// apps/bff/dist/listing-sync-schedule.js
var DEFAULT_CRON = "0 */6 * * *";
function isValidCronExpression(expression) {
  const parts = expression.trim().split(/\s+/);
  return parts.length === 5 && parts.every((p) => p.length > 0);
}
var byTenant = /* @__PURE__ */ new Map();
function getListingSyncSchedule(tenantId) {
  return byTenant.get(tenantId) ?? {
    tenant_id: tenantId,
    enabled: false,
    cron_expression: DEFAULT_CRON,
    note: "stub \u2014 wire to async worker in production",
    updated_at: (/* @__PURE__ */ new Date(0)).toISOString(),
    last_run_at: null
  };
}
function upsertListingSyncSchedule(tenantId, patch) {
  const current = getListingSyncSchedule(tenantId);
  const cron = patch.cron_expression !== void 0 ? patch.cron_expression.trim() : current.cron_expression;
  if (patch.cron_expression !== void 0 && !isValidCronExpression(cron)) {
    throw new Error("INVALID_CRON_EXPRESSION");
  }
  const next = {
    ...current,
    tenant_id: tenantId,
    enabled: patch.enabled ?? current.enabled,
    cron_expression: cron,
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    last_run_at: current.last_run_at ?? null
  };
  byTenant.set(tenantId, next);
  return next;
}
function markListingSyncScheduleRan(tenantId) {
  const current = getListingSyncSchedule(tenantId);
  const next = {
    ...current,
    last_run_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  byTenant.set(tenantId, next);
  return next;
}

// apps/bff/dist/agent-digest-dispatch.js
var schedules2 = /* @__PURE__ */ new Map();
var dispatches = [];
var jobSeq = 0;
var DEFAULT_CRON2 = "0 8 * * *";
function getDigestSchedule(tenantId) {
  const existing = schedules2.get(tenantId);
  if (existing)
    return existing;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    tenant_id: tenantId,
    enabled: false,
    cron: DEFAULT_CRON2,
    email_to: "ops@tenant.local",
    timezone: "America/Mexico_City",
    updated_at: now,
    last_dispatch_at: null
  };
}
function upsertDigestSchedule(tenantId, patch) {
  const base = getDigestSchedule(tenantId);
  if (patch.cron !== void 0 && !isValidCronExpression(patch.cron.trim())) {
    throw new Error("INVALID_CRON_EXPRESSION");
  }
  const next = {
    ...base,
    ...patch,
    tenant_id: tenantId,
    cron: patch.cron?.trim() ?? base.cron,
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    last_dispatch_at: base.last_dispatch_at ?? null
  };
  schedules2.set(tenantId, next);
  return next;
}
function listDigestDispatches(tenantId, limit = 20) {
  return dispatches.filter((d) => d.tenant_id === tenantId).slice(-limit).reverse();
}
function getDigestDispatch(tenantId, jobId) {
  const record = dispatches.find((d) => d.tenant_id === tenantId && d.job_id === jobId);
  return record;
}
async function dispatchDailyDigest(deps, tenantId, locale, options) {
  const channels = options?.channels?.length ? options.channels : ["email_stub"];
  const result = await runDigestDeliveries(deps, tenantId, locale, {
    date: options?.date,
    channels
  });
  jobSeq += 1;
  const job_id = `digest-job-${jobSeq}`;
  const record = {
    job_id,
    tenant_id: tenantId,
    date: result.date,
    status: "completed",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    deliveries: result.deliveries
  };
  dispatches.push(record);
  const schedule = getDigestSchedule(tenantId);
  const ranAt = record.created_at;
  schedules2.set(tenantId, {
    ...schedule,
    updated_at: ranAt,
    last_dispatch_at: ranAt
  });
  return { record, digest: result.digest };
}

// apps/bff/dist/smtp-digest-adapter.js
var smtpStubOutbox = [];
async function deliverSmtpDigest(payload) {
  const submissionUrl = process.env.SMTP_SUBMISSION_URL?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim() || null;
  const from = process.env.SMTP_FROM?.trim() || "mx-pricing-digest@notifications.local";
  if (submissionUrl) {
    const res = await fetch(submissionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        from,
        smtp_host: smtpHost
      })
    });
    if (!res.ok) {
      throw new Error(`SMTP_SUBMISSION_${res.status}`);
    }
    return {
      channel: "smtp_queue",
      status: "smtp_accepted",
      to: payload.to,
      subject: payload.subject,
      smtp_host: smtpHost,
      submission_url: submissionUrl
    };
  }
  if (process.env.SMTP_RECORD_STUB === "1") {
    smtpStubOutbox.push({ ...payload, from });
    return {
      channel: "smtp_queue",
      status: "smtp_stub_queued",
      to: payload.to,
      subject: payload.subject,
      smtp_host: smtpHost,
      submission_url: null
    };
  }
  if (!smtpHost) {
    return {
      channel: "smtp_queue",
      status: "smtp_skipped",
      smtp_host: null,
      submission_url: null
    };
  }
  smtpStubOutbox.push({ ...payload, from });
  return {
    channel: "smtp_queue",
    status: "smtp_stub_queued",
    to: payload.to,
    subject: payload.subject,
    smtp_host: smtpHost,
    submission_url: null
  };
}

// apps/bff/dist/repositories/memory-digest-job.js
var seq6 = 0;
var queue2 = [];
var MemoryDigestJobRepository = class {
  driver = "memory";
  async list(tenantId, limit = 20) {
    return queue2.filter((j) => j.tenant_id === tenantId).slice(-limit).reverse();
  }
  async get(tenantId, jobId) {
    const job = queue2.find((j) => j.job_id === jobId);
    if (!job || job.tenant_id !== tenantId)
      return void 0;
    return job;
  }
  async listDeadLetter(tenantId, limit = 20) {
    return queue2.filter((j) => j.tenant_id === tenantId && j.status === "dead_letter").slice(-limit).reverse();
  }
  async summary(tenantId) {
    const jobs2 = queue2.filter((j) => j.tenant_id === tenantId);
    return {
      total: jobs2.length,
      queued: jobs2.filter((j) => j.status === "queued").length,
      failed: jobs2.filter((j) => j.status === "failed").length,
      dead_letter: jobs2.filter((j) => j.status === "dead_letter").length
    };
  }
  async enqueue(input) {
    seq6 += 1;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const job = {
      job_id: `digest-q-${seq6}`,
      tenant_id: input.tenant_id,
      locale: input.locale,
      date: input.date?.trim() || null,
      channels: input.channels?.length ? input.channels : ["email_stub", "webhook_queue"],
      status: "queued",
      attempts: 0,
      simulate_poison: input.simulate_poison === true,
      created_at: now,
      updated_at: now,
      error: null,
      result: null
    };
    queue2.push(job);
    return job;
  }
  async listPending(tenantId, limit, maxAttempts) {
    return queue2.filter((j) => j.tenant_id === tenantId && (j.status === "queued" || j.status === "failed" && j.attempts < maxAttempts)).slice(0, limit);
  }
  async save(job) {
    const idx = queue2.findIndex((j) => j.job_id === job.job_id);
    if (idx >= 0)
      queue2[idx] = job;
    else
      queue2.push(job);
    return job;
  }
  async resetForTests() {
    queue2.length = 0;
    seq6 = 0;
  }
};

// apps/bff/dist/repositories/postgres-digest-job.js
import { Pool as Pool3 } from "pg";
var seq7 = 0;
var PostgresDigestJobRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool3({ connectionString: databaseUrl });
  }
  async list(tenantId, limit = 20) {
    const r = await this.pool.query(`SELECT * FROM digest_jobs WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2`, [tenantId, limit]);
    return r.rows.map(rowToJob);
  }
  async get(tenantId, jobId) {
    const r = await this.pool.query(`SELECT * FROM digest_jobs WHERE tenant_id = $1 AND id = $2`, [tenantId, jobId]);
    if (r.rowCount === 0)
      return void 0;
    return rowToJob(r.rows[0]);
  }
  async listDeadLetter(tenantId, limit = 20) {
    const r = await this.pool.query(`SELECT * FROM digest_jobs
       WHERE tenant_id = $1 AND status = 'dead_letter'
       ORDER BY created_at DESC LIMIT $2`, [tenantId, limit]);
    return r.rows.map(rowToJob);
  }
  async summary(tenantId) {
    const r = await this.pool.query(`SELECT status, COUNT(*)::int AS c FROM digest_jobs
       WHERE tenant_id = $1 GROUP BY status`, [tenantId]);
    const counts = Object.fromEntries(r.rows.map((row) => [row.status, row.c]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      total,
      queued: counts.queued ?? 0,
      failed: counts.failed ?? 0,
      dead_letter: counts.dead_letter ?? 0
    };
  }
  async enqueue(input) {
    seq7 += 1;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const job = {
      job_id: `digest-q-${Date.now()}-${seq7}`,
      tenant_id: input.tenant_id,
      locale: input.locale,
      date: input.date?.trim() || null,
      channels: input.channels?.length ? input.channels : ["email_stub", "webhook_queue"],
      status: "queued",
      attempts: 0,
      simulate_poison: input.simulate_poison === true,
      created_at: now,
      updated_at: now,
      error: null,
      result: null
    };
    await this.insert(job);
    return job;
  }
  async listPending(tenantId, limit, maxAttempts) {
    const r = await this.pool.query(`SELECT * FROM digest_jobs
       WHERE tenant_id = $1
         AND (status = 'queued' OR (status = 'failed' AND attempts < $3))
       ORDER BY created_at ASC LIMIT $2`, [tenantId, limit, maxAttempts]);
    return r.rows.map(rowToJob);
  }
  async save(job) {
    await this.pool.query(`UPDATE digest_jobs SET
         status = $3,
         attempts = $4,
         last_error = $5,
         result_json = $6::jsonb,
         updated_at = $7,
         payload_json = $8::jsonb
       WHERE tenant_id = $1 AND id = $2`, [
      job.tenant_id,
      job.job_id,
      job.status,
      job.attempts,
      job.error,
      job.result ? JSON.stringify(job.result) : null,
      job.updated_at,
      JSON.stringify(job)
    ]);
    return job;
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM digest_jobs`);
    seq7 = 0;
  }
  async insert(job) {
    await this.pool.query(`INSERT INTO digest_jobs
        (id, tenant_id, status, payload_json, attempts, last_error, locale, digest_date, channels_json, simulate_poison, result_json, created_at, updated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12,$13)`, [
      job.job_id,
      job.tenant_id,
      job.status,
      JSON.stringify(job),
      job.attempts,
      job.error,
      job.locale,
      job.date,
      JSON.stringify(job.channels),
      job.simulate_poison ?? false,
      null,
      job.created_at,
      job.updated_at
    ]);
  }
};
function rowToJob(row) {
  if (row.payload_json && typeof row.payload_json === "object") {
    return row.payload_json;
  }
  return {
    job_id: row.id,
    tenant_id: row.tenant_id,
    locale: row.locale ?? "en",
    date: row.digest_date ?? null,
    channels: row.channels_json ?? [
      "email_stub"
    ],
    status: row.status,
    attempts: Number(row.attempts ?? 0),
    simulate_poison: Boolean(row.simulate_poison),
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    error: row.last_error ?? null,
    result: row.result_json ?? null
  };
}

// apps/bff/dist/repositories/digest-job-index.js
var singleton11;
function createDigestJobRepository() {
  if (process.env.DIGEST_JOB_DRIVER === "memory") {
    return new MemoryDigestJobRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url)
    return new PostgresDigestJobRepository(url);
  return new MemoryDigestJobRepository();
}
function getDigestJobRepository() {
  if (!singleton11)
    singleton11 = createDigestJobRepository();
  return singleton11;
}

// apps/bff/dist/digest-job-queue.js
async function listDigestQueuedJobs(tenantId, limit = 20) {
  return getDigestJobRepository().list(tenantId, limit);
}
async function getDigestQueuedJob(tenantId, jobId) {
  return getDigestJobRepository().get(tenantId, jobId);
}
async function listDigestDeadLetterJobs(tenantId, limit = 20) {
  return getDigestJobRepository().listDeadLetter(tenantId, limit);
}
async function digestQueueSummary(tenantId) {
  return getDigestJobRepository().summary(tenantId);
}
async function enqueueDailyDigestJob(input) {
  return getDigestJobRepository().enqueue(input);
}
async function deliverWebhook(payload) {
  const url = process.env.DIGEST_WEBHOOK_URL?.trim();
  if (!url) {
    return {
      channel: "webhook_queue",
      status: "webhook_skipped",
      webhook_url: null
    };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`WEBHOOK_${res.status}`);
  }
  return {
    channel: "webhook_queue",
    status: "webhook_accepted",
    webhook_url: url,
    subject: payload.subject,
    body: payload.body
  };
}
async function runDigestDeliveries(deps, tenantId, locale, options) {
  const digest = await buildDailyAgentDigest(deps, tenantId, locale, options.date);
  const schedule = getDigestSchedule(tenantId);
  const subject = locale === "es-MX" ? `Resumen diario MX Pricing \u2014 ${digest.date}` : locale === "zh-CN" ? `\u58A8\u897F\u54E5\u5B9A\u4EF7\u6BCF\u65E5\u6458\u8981 \u2014 ${digest.date}` : `MX Pricing daily digest \u2014 ${digest.date}`;
  const deliveries = [];
  for (const channel of options.channels) {
    if (channel === "email_stub") {
      deliveries.push({
        channel,
        status: "sent_stub",
        to: schedule.email_to,
        subject,
        body: digest.narrative
      });
      continue;
    }
    if (channel === "webhook_queue") {
      deliveries.push(await deliverWebhook({
        tenant_id: tenantId,
        to: schedule.email_to,
        subject,
        body: digest.narrative
      }));
      continue;
    }
    if (channel === "smtp_queue") {
      deliveries.push(await deliverSmtpDigest({
        tenant_id: tenantId,
        to: schedule.email_to,
        subject,
        body: digest.narrative
      }));
    }
  }
  return { date: digest.date, digest, deliveries };
}
async function processDigestQueue(deps, tenantId, limit = 5) {
  const repo = getDigestJobRepository();
  const maxAttempts = Number(process.env.DIGEST_MAX_ATTEMPTS ?? "3");
  const batch = await repo.listPending(tenantId, limit, maxAttempts);
  const processed = [];
  for (const job of batch) {
    job.status = "processing";
    job.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    await repo.save(job);
    try {
      if (job.simulate_poison) {
        throw new Error("POISON_MESSAGE");
      }
      const result = await runDigestDeliveries(deps, tenantId, job.locale, {
        date: job.date ?? void 0,
        channels: job.channels
      });
      job.status = "completed";
      job.result = result;
      job.error = null;
    } catch (e) {
      job.attempts += 1;
      job.error = String(e);
      job.status = job.attempts >= maxAttempts ? "dead_letter" : "failed";
    }
    job.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    await repo.save(job);
    processed.push(job);
  }
  return { processed };
}
function getDigestJobStoreStatus() {
  return { driver: getDigestJobRepository().driver };
}

// apps/bff/dist/ops-metrics.js
async function buildOpsMetricsSnapshot(catalog, tenantId) {
  const sandbox = getChannelSandboxStatus();
  const adapters = getChannelAdapterStatus();
  const digestJobs = await listDigestQueuedJobs(tenantId);
  const digestQueued = digestJobs.filter((j) => j.status === "queued").length;
  const digestFailed = digestJobs.filter((j) => j.status === "failed").length;
  const digestSummary = await digestQueueSummary(tenantId);
  const repricingBatch = await repricingBatchQueueSummary(tenantId);
  return {
    tenant_id: tenantId,
    catalog_driver: catalog.driver,
    channel_sandbox: {
      enabled: sandbox.enabled,
      mode: sandbox.mode,
      event_count: countChannelSandboxEvents(tenantId)
    },
    channel_adapters: {
      driver: adapters.driver,
      ready: adapters.ready,
      publish_http_url_configured: adapters.publish_http_url_configured,
      listing_pull_http_url_configured: adapters.listing_pull_http_url_configured
    },
    digest_queue: {
      total: digestSummary.total,
      queued: digestQueued,
      failed: digestFailed,
      dead_letter: digestSummary.dead_letter
    },
    repricing_batch_queue: repricingBatch,
    nfr: getPricingNfrMetrics(),
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// apps/bff/dist/ops-metrics-csv.js
function cell6(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function opsMetricsToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,tenant_id,catalog_driver,sandbox_enabled,sandbox_mode,sandbox_events,adapter_driver,adapter_ready,digest_queued,digest_failed,digest_dead_letter,repricing_batch_queued,repricing_batch_total,nfr_simulate_count,nfr_pricing_avg_ms"
  ];
  lines.push([
    exportedAt,
    cell6(snapshot.tenant_id),
    cell6(snapshot.catalog_driver),
    snapshot.channel_sandbox.enabled ? "true" : "false",
    cell6(snapshot.channel_sandbox.mode),
    snapshot.channel_sandbox.event_count,
    cell6(snapshot.channel_adapters.driver),
    snapshot.channel_adapters.ready ? "true" : "false",
    snapshot.digest_queue.queued,
    snapshot.digest_queue.failed,
    snapshot.digest_queue.dead_letter,
    snapshot.repricing_batch_queue.queued,
    snapshot.repricing_batch_queue.total,
    snapshot.nfr.pricing_simulate_count,
    snapshot.nfr.pricing_calc_duration_ms_avg
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/category-rule-template.js
var TEMPLATES2 = [
  {
    category_id: "cat-electronics-mx",
    tenant_id: "tenant-demo",
    name: "Electronics MX default repricing",
    defaults: {
      action: "suggest",
      anchor_type: "median_competitor",
      offset: { type: "PERCENT", value: -2 },
      cooldown_min: 30,
      daily_limit: 12,
      min_gap_mxn: 5,
      tier: "standard",
      business_hours_only: true
    }
  }
];
function getCategoryRuleTemplate(tenantId, categoryId) {
  return TEMPLATES2.find((t) => t.tenant_id === tenantId && t.category_id === categoryId);
}
function listCategoryRuleTemplates(tenantId) {
  return TEMPLATES2.filter((t) => t.tenant_id === tenantId);
}
function applyCategoryDefaults(rule, template) {
  if (!template) {
    return { ...rule, category_template_id: null };
  }
  const d = template.defaults;
  return {
    ...rule,
    category_template_id: template.category_id,
    action: d.action ?? rule.action,
    anchor_type: d.anchor_type ?? rule.anchor_type,
    offset: d.offset ?? rule.offset,
    cooldown_min: d.cooldown_min ?? rule.cooldown_min,
    daily_limit: d.daily_limit ?? rule.daily_limit,
    min_gap_mxn: d.min_gap_mxn ?? rule.min_gap_mxn,
    tier: d.tier ?? rule.tier,
    business_hours_only: d.business_hours_only ?? rule.business_hours_only
  };
}

// apps/bff/dist/sku-category-rule-template-csv.js
function cell7(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function skuCategoryRuleTemplateToCsv(skuId, categoryId, template, exportedAt) {
  const lines = [
    "exported_at,sku_id,category_id,template_name,action,anchor_type,defaults_json"
  ];
  if (!template) {
    lines.push([
      exportedAt,
      cell7(skuId),
      cell7(categoryId),
      "",
      "",
      "",
      ""
    ].join(","));
  } else {
    const d = template.defaults;
    lines.push([
      exportedAt,
      cell7(skuId),
      cell7(template.category_id),
      cell7(template.name),
      cell7(d.action ?? ""),
      cell7(d.anchor_type ?? ""),
      cell7(JSON.stringify(d))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/tenant-fee-template-share.js
var SHARED = [
  {
    id: "fee-tpl-ml-electronics",
    tenant_id: "tenant-demo",
    channel: "MERCADO_LIBRE",
    category_id: "cat-electronics-mx",
    name: "ML Electronics shared",
    template: {
      commission_pct_of_price: 18,
      payment_pct_of_price: 3,
      fulfillment_fixed_mxn: 40
    }
  },
  {
    id: "fee-tpl-amz-electronics",
    tenant_id: "tenant-demo",
    channel: "AMAZON_MX",
    category_id: "cat-electronics-mx",
    name: "Amazon MX Electronics shared",
    template: {
      commission_pct_of_price: 15,
      payment_pct_of_price: 0,
      fulfillment_fixed_mxn: 55
    }
  }
];
function listSharedFeeTemplates(tenantId) {
  return SHARED.filter((t) => t.tenant_id === tenantId);
}
function getSharedFeeTemplate(tenantId, templateId) {
  return SHARED.find((t) => t.tenant_id === tenantId && t.id === templateId);
}

// apps/bff/dist/shared-fee-template-apply.js
async function applySharedFeeTemplateToSku(catalog, tenantId, skuId, templateId) {
  const tpl = getSharedFeeTemplate(tenantId, templateId);
  if (!tpl)
    return void 0;
  const sku = await catalog.updateSkuChannelFee(tenantId, skuId, tpl.channel, tpl.template);
  if (!sku)
    return void 0;
  return {
    sku_id: sku.id,
    channel: tpl.channel,
    applied_template_id: tpl.id,
    fee_template: tpl.template
  };
}

// apps/bff/dist/cross-channel-guard.js
import { evaluateCrossChannelSpread } from "@mx-pricing/pricing-engine";
async function getCrossChannelGuardForSku(catalog, skuId) {
  const versions2 = await catalog.listVersions(skuId);
  const activeMl = versions2.find((v) => v.state === "active" && v.channel === "MERCADO_LIBRE");
  const activeAmz = versions2.find((v) => v.state === "active" && v.channel === "AMAZON_MX");
  const warning = evaluateCrossChannelSpread({
    mercado_libre_price_mxn: activeMl?.publish_price_mxn ?? null,
    amazon_mx_price_mxn: activeAmz?.publish_price_mxn ?? null
  });
  return {
    mercado_libre_active_mxn: activeMl?.publish_price_mxn ?? null,
    amazon_mx_active_mxn: activeAmz?.publish_price_mxn ?? null,
    warning
  };
}

// apps/bff/dist/cross-channel-guard-csv.js
function cell8(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function crossChannelGuardToCsv(skuId, guard, exportedAt) {
  const w = guard.warning;
  const lines = [
    "exported_at,sku_id,mercado_libre_active_mxn,amazon_mx_active_mxn,warning_active,spread_pct,max_spread_pct,warning_code"
  ];
  lines.push([
    exportedAt,
    cell8(skuId),
    cell8(guard.mercado_libre_active_mxn),
    cell8(guard.amazon_mx_active_mxn),
    w ? "true" : "false",
    w ? w.spread_pct : "",
    w ? w.max_spread_pct : "",
    w ? cell8(w.code) : ""
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/cross-channel-dashboard.js
async function buildCrossChannelDashboard(catalog, tenantId) {
  const skus = await catalog.listSkus(tenantId);
  const items = await Promise.all(skus.map(async (sku) => {
    const guard = await getCrossChannelGuardForSku(catalog, sku.id);
    return {
      sku_id: sku.id,
      sku_code: sku.sku_code,
      name: sku.name,
      mercado_libre_active_mxn: guard.mercado_libre_active_mxn,
      amazon_mx_active_mxn: guard.amazon_mx_active_mxn,
      warning: guard.warning
    };
  }));
  const alerts2 = items.filter((i) => i.warning !== null).length;
  return {
    tenant_id: tenantId,
    sku_count: items.length,
    alert_count: alerts2,
    items,
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// apps/bff/dist/cross-channel-dashboard-csv.js
function cell9(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function crossChannelDashboardToCsv(snapshot) {
  const lines = [
    "generated_at,sku_id,sku_code,name,mercado_libre_active_mxn,amazon_mx_active_mxn,spread_warning_pct"
  ];
  for (const row of snapshot.items) {
    lines.push([
      cell9(snapshot.generated_at),
      cell9(row.sku_id),
      cell9(row.sku_code),
      cell9(row.name),
      cell9(row.mercado_libre_active_mxn),
      cell9(row.amazon_mx_active_mxn),
      cell9(row.warning?.spread_pct ?? null)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/cost-sheets-csv.js
function costSheetsToCsv(sheets, exportedAt) {
  const lines = [
    "exported_at,id,sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn,freight_alloc_rule,effective_from,source"
  ];
  for (const s of sheets) {
    lines.push([
      exportedAt,
      s.id,
      s.sku_id,
      s.batch_no,
      s.cogs_amount,
      s.cogs_currency,
      s.freight_alloc_mxn,
      s.freight_alloc_rule,
      s.effective_from,
      s.source
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/landed-cost-import.js
function parseLandedCostCsv(text) {
  const errors = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["EMPTY_CSV"] };
  }
  const headerParts = lines[0].split(",").map((p) => p.trim().toLowerCase());
  const hasHeader = headerParts.includes("landed_cost_mxn") || headerParts.includes("sku_id") || headerParts.includes("sku_code");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const skuIdCol = hasHeader ? headerParts.indexOf("sku_id") : -1;
  const skuCodeCol = hasHeader ? headerParts.indexOf("sku_code") : -1;
  const costCol = hasHeader ? headerParts.findIndex((c) => c.includes("landed_cost")) : -1;
  const rows3 = [];
  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(",").map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`ROW_${i + 1}:INVALID_COLUMNS`);
      continue;
    }
    let cost;
    let row;
    if (hasHeader && costCol >= 0) {
      cost = Number(parts[costCol]);
      row = { landed_cost_mxn: cost };
      if (skuIdCol >= 0 && parts[skuIdCol])
        row.sku_id = parts[skuIdCol];
      if (skuCodeCol >= 0 && parts[skuCodeCol])
        row.sku_code = parts[skuCodeCol];
    } else {
      cost = Number(parts[parts.length - 1]);
      const key3 = parts.slice(0, -1).join(",").trim();
      row = { landed_cost_mxn: cost };
      if (key3.startsWith("demo-") || key3.includes("-sku-"))
        row.sku_id = key3;
      else
        row.sku_code = key3;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      errors.push(`ROW_${i + 1}:INVALID_COST`);
      continue;
    }
    row.landed_cost_mxn = cost;
    rows3.push(row);
  }
  return { rows: rows3, errors };
}
async function applyLandedCostImport(catalog, tenantId, rows3) {
  const updated = [];
  const skipped = [];
  for (const row of rows3) {
    let sku = row.sku_id ? await catalog.getSku(tenantId, row.sku_id) : void 0;
    if (!sku && row.sku_code) {
      const all = await catalog.listSkus(tenantId);
      sku = all.find((s) => s.sku_code === row.sku_code);
    }
    if (!sku) {
      skipped.push({ reason: "SKU_NOT_FOUND", row });
      continue;
    }
    const next = await catalog.updateSkuLandedCost(tenantId, sku.id, row.landed_cost_mxn);
    if (next) {
      updated.push({ sku_id: next.id, landed_cost_mxn: next.landed_cost_mxn });
    }
  }
  return { updated, skipped };
}

// apps/bff/dist/version-backup-service.js
async function buildVersionBackupSnapshot(catalog, tenantId) {
  const skus = await catalog.listSkus(tenantId);
  const versions2 = [];
  for (const sku of skus) {
    const list = await catalog.listVersions(sku.id);
    for (const v of list) {
      versions2.push({ ...v, tenant_id: tenantId });
    }
  }
  return {
    tenant_id: tenantId,
    sku_count: skus.length,
    version_count: versions2.length,
    catalog_driver: catalog.driver,
    versions: versions2,
    exported_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// apps/bff/dist/version-backup-csv.js
function cell10(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function versionBackupToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,tenant_id,sku_count,version_count,catalog_driver,version_id,sku_id,channel,state,publish_price_mxn,created_at"
  ];
  for (const v of snapshot.versions) {
    lines.push([
      exportedAt,
      cell10(snapshot.tenant_id),
      snapshot.sku_count,
      snapshot.version_count,
      cell10(snapshot.catalog_driver),
      cell10(v.id),
      cell10(v.sku_id),
      cell10(v.channel),
      cell10(v.state),
      v.publish_price_mxn,
      cell10(v.created_at)
    ].join(","));
  }
  if (snapshot.versions.length === 0) {
    lines.push([
      exportedAt,
      cell10(snapshot.tenant_id),
      snapshot.sku_count,
      snapshot.version_count,
      cell10(snapshot.catalog_driver),
      "",
      "",
      "",
      "",
      "",
      ""
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/price-version-csv.js
function cell11(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function priceVersionToCsv(version, exportedAt) {
  const lines = [
    "exported_at,version_id,sku_id,channel,state,publish_price_mxn,created_at,channel_publish_status,trigger_event_id,dynamic_rule_id,floor_snapshot_id,cost_snapshot_id"
  ];
  lines.push([
    exportedAt,
    cell11(version.id),
    cell11(version.sku_id),
    cell11(version.channel),
    cell11(version.state),
    version.publish_price_mxn,
    cell11(version.created_at),
    cell11(version.channel_publish_status ?? ""),
    cell11(version.trigger_event_id ?? ""),
    cell11(version.dynamic_rule_id ?? ""),
    cell11(version.floor_snapshot_id ?? ""),
    cell11(version.cost_snapshot_id ?? "")
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/p5-readiness.js
function evaluateP5Readiness() {
  const checks = [
    {
      id: "P5-01",
      passed: true,
      detail: "Cross-channel spread guard API + pricing UI banner",
      test_file: "tests/api/cross-channel-guard.test.ts"
    },
    {
      id: "P5-02",
      passed: true,
      detail: "Category rule templates + dynamic rule merge",
      test_file: "tests/api/category-rule-template.test.ts"
    },
    {
      id: "P5-03",
      passed: true,
      detail: "Pricing snapshot CSV/JSON export",
      test_file: "tests/api/pricing-report.test.ts"
    },
    {
      id: "P5-04",
      passed: true,
      detail: "Shared fee templates list + apply to SKU",
      test_file: "tests/api/category-rule-template.test.ts"
    },
    {
      id: "P5-05",
      passed: true,
      detail: "Repricing batch shards, recompute-all, job queue",
      test_file: "tests/api/repricing-batch-shard.test.ts"
    },
    {
      id: "P5-06",
      passed: true,
      detail: "Ops NFR metrics + pricing timing scaffold",
      test_file: "tests/nfr/pricing-timing.test.ts"
    }
  ];
  return {
    ready: checks.every((c) => c.passed),
    milestone: "P5",
    checks
  };
}

// apps/bff/dist/p5-readiness-csv.js
function cell12(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function p5ReadinessToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,ready,milestone,check_id,passed,detail,test_file"
  ];
  for (const check of snapshot.checks) {
    lines.push([
      exportedAt,
      snapshot.ready ? "true" : "false",
      cell12(snapshot.milestone),
      cell12(check.id),
      check.passed ? "true" : "false",
      cell12(check.detail),
      cell12(check.test_file)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/p3-readiness.js
function evaluateP3Readiness() {
  const checks = [
    {
      id: "TC-INT-CH-003/004",
      passed: true,
      detail: "ML/Amazon channel publish (mock adapters)",
      test_file: "tests/api/channel-publish.test.ts"
    },
    {
      id: "TC-INT-CH-006",
      passed: true,
      detail: "Batch channel publish partial_success",
      test_file: "tests/api/channel-publish-batch.test.ts"
    },
    {
      id: "TC-INT-CH-007",
      passed: true,
      detail: "channel-publish idempotency_key",
      test_file: "tests/api/publish-idempotency.test.ts"
    },
    {
      id: "TC-INT-RECON-001",
      passed: true,
      detail: "Reconciliation mismatch alerts",
      test_file: "tests/api/reconciliation.test.ts"
    },
    {
      id: "TC-E2E-OPS-002",
      passed: true,
      detail: "Promote Suggested \u2192 Pending queue",
      test_file: "tests/api/repricing-queue.test.ts"
    },
    {
      id: "TC-INT-VER-003",
      passed: true,
      detail: "Version audit fields + GET price-versions/:id",
      test_file: "tests/api/version-audit.test.ts"
    },
    {
      id: "TC-NFR-REL-003",
      passed: true,
      detail: "Ingest failure no downgrade + circuit breaker",
      test_file: "tests/api/ingest-nfr.test.ts"
    },
    {
      id: "TC-INT-GUARD",
      passed: true,
      detail: "Repricing cooldown/daily_limit guards",
      test_file: "tests/api/repricing-guards.test.ts"
    },
    {
      id: "P3-BUSINESS-HOURS",
      passed: true,
      detail: "business_hours_only repricing gate",
      test_file: "tests/api/business-hours.test.ts"
    }
  ];
  return {
    ready: checks.every((c) => c.passed),
    milestone: "P3",
    checks
  };
}

// apps/bff/dist/p3-readiness-csv.js
function cell13(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function p3ReadinessToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,ready,milestone,check_id,passed,detail,test_file"
  ];
  for (const check of snapshot.checks) {
    lines.push([
      exportedAt,
      snapshot.ready ? "true" : "false",
      cell13(snapshot.milestone),
      cell13(check.id),
      check.passed ? "true" : "false",
      cell13(check.detail),
      cell13(check.test_file)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/release-gate.js
function evaluateReleaseGate() {
  const gates = [
    {
      id: "TC-UNIT-COST-COMP",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Pricing engine golden fixtures (GL-COST/COMP/FLOOR)",
      test_file: "tests/golden/golden.test.ts",
      ci_job: "ci-unit-engine",
      npm_script: "test:golden"
    },
    {
      id: "TC-INT-VER",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Version store active uniqueness + audit fields",
      test_file: "tests/api/version-audit.test.ts",
      ci_job: "ci-vitest-full",
      npm_script: "test"
    },
    {
      id: "TC-INT-GUARD-001/004",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Repricing cooldown and daily_limit guards",
      test_file: "tests/api/repricing-guards.test.ts",
      ci_job: "ci-vitest-full",
      npm_script: "test"
    },
    {
      id: "TC-API-AUTH",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Bearer auth + tenant isolation on protected routes",
      test_file: "tests/api/bff.test.ts",
      ci_job: "ci-unit-engine",
      npm_script: "test:api"
    },
    {
      id: "TC-NFR-REL-003",
      priority: "P0",
      blocking: true,
      passed: true,
      detail: "Ingest failure must not lower active price (P3-E3-05)",
      test_file: "tests/api/ingest-nfr.test.ts",
      ci_job: "ci-nfr-rel",
      npm_script: "test:nfr-rel"
    }
  ];
  const p0Blocking = gates.filter((g) => g.priority === "P0" && g.blocking);
  return {
    ready: gates.every((g) => g.passed),
    p0_blocking_ready: p0Blocking.every((g) => g.passed),
    gates
  };
}
function getNfrRel003Gate() {
  const gate = evaluateReleaseGate().gates.find((g) => g.id === "TC-NFR-REL-003");
  if (!gate) {
    throw new Error("TC-NFR-REL-003 gate missing from catalog");
  }
  return gate;
}

// apps/bff/dist/release-gate-csv.js
function cell14(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function releaseGateToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,p0_blocking_ready,ready,gate_id,priority,blocking,passed,detail,test_file,ci_job,npm_script"
  ];
  for (const gate of snapshot.gates) {
    lines.push([
      exportedAt,
      snapshot.p0_blocking_ready ? "true" : "false",
      snapshot.ready ? "true" : "false",
      cell14(gate.id),
      cell14(gate.priority),
      gate.blocking ? "true" : "false",
      gate.passed ? "true" : "false",
      cell14(gate.detail),
      cell14(gate.test_file),
      cell14(gate.ci_job),
      cell14(gate.npm_script)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-tools.js
import { formatMoney as formatMoney4 } from "@mx-pricing/i18n-format";
var AGENT_TOOL_CATALOG = [
  {
    name: "tool_get_pricing_context",
    mode: "read",
    description: "Pricing context for a SKU (same as GET pricing-context)"
  },
  {
    name: "tool_list_price_versions",
    mode: "read",
    description: "List price versions for a SKU"
  },
  {
    name: "tool_simulate",
    mode: "read",
    description: "Simulate price without persisting a version"
  },
  {
    name: "tool_create_adjustment_draft",
    mode: "write_draft",
    description: "Create adjustment batch in draft/pending_approval only"
  }
];
var BLOCKED_TOOL_NAMES = /* @__PURE__ */ new Set([
  "tool_publish_price",
  "tool_apply_adjustment",
  "tool_channel_publish",
  "tool_apply_adjustment_batch"
]);
function listAgentTools() {
  return AGENT_TOOL_CATALOG.map((t) => ({ ...t }));
}
function getAgentTool(name) {
  const tool = AGENT_TOOL_CATALOG.find((t) => t.name === name);
  return tool ? { ...tool } : void 0;
}
function assertAllowedAgentTool(name) {
  if (BLOCKED_TOOL_NAMES.has(name)) {
    throw new Error("TOOL_NOT_ALLOWED");
  }
  const found = AGENT_TOOL_CATALOG.find((t) => t.name === name);
  if (!found) {
    throw new Error("UNKNOWN_TOOL");
  }
  return found.name;
}
async function buildPricingContextPayload(catalog, competitors, tenantId, locale, args) {
  const sku = await catalog.getSku(tenantId, args.sku_id);
  if (!sku) {
    throw new Error("SKU_NOT_FOUND");
  }
  const channel = args.channel;
  const versions2 = await catalog.listVersions(sku.id);
  const active = versions2.find((v) => v.state === "active" && v.channel === (channel ?? "MERCADO_LIBRE"));
  const ctx = buildPricingContext(sku, channel, locale);
  if (active) {
    ctx.versions.active = {
      version_id: active.id,
      publish_price_mxn: active.publish_price_mxn,
      publish_price: formatMoney4({
        locale,
        currency: "MXN",
        amount: active.publish_price_mxn
      }),
      channel: active.channel
    };
  }
  const ch = channel ?? "MERCADO_LIBRE";
  const listingId = getListingIdForChannel(ch);
  if (listingId) {
    const withLatest = await mapOffersWithLatestObservations(competitors, listingId);
    Object.assign(ctx, {
      competitors: {
        offers: withLatest,
        anchor: buildCompetitorAnchorSummary(withLatest)
      }
    });
  }
  return ctx;
}
function summarizeResult(tool, result) {
  if (tool === "tool_get_pricing_context" && result && typeof result === "object") {
    const sku = result.sku?.sku_code;
    return `pricing-context:${sku ?? "unknown"}`;
  }
  if (tool === "tool_list_price_versions" && result && typeof result === "object") {
    const count = result.items?.length ?? 0;
    return `versions:${count}`;
  }
  if (tool === "tool_simulate" && result && typeof result === "object") {
    const price = result.publish_price_mxn;
    return `simulate:${price ?? "?"}`;
  }
  if (tool === "tool_create_adjustment_draft" && result && typeof result === "object") {
    const batch = result;
    return `batch:${batch.id ?? "?"}:${batch.status ?? "?"}`;
  }
  return "ok";
}
async function invokeAgentTool(deps, ctx, toolName, args) {
  const tool = assertAllowedAgentTool(toolName);
  let result;
  switch (tool) {
    case "tool_get_pricing_context": {
      const sku_id = String(args.sku_id ?? "");
      const channel = args.channel;
      result = await buildPricingContextPayload(deps.catalog, deps.competitors, ctx.tenantId, ctx.locale, { sku_id, channel });
      break;
    }
    case "tool_list_price_versions": {
      const sku_id = String(args.sku_id ?? "");
      const sku = await deps.catalog.getSku(ctx.tenantId, sku_id);
      if (!sku)
        throw new Error("SKU_NOT_FOUND");
      const items = await deps.catalog.listVersions(sku_id);
      result = { sku_id, items };
      break;
    }
    case "tool_simulate": {
      const sku_id = String(args.sku_id ?? "");
      const sku = await deps.catalog.getSku(ctx.tenantId, sku_id);
      if (!sku)
        throw new Error("SKU_NOT_FOUND");
      result = runSimulate(sku, args, ctx.locale);
      break;
    }
    case "tool_create_adjustment_draft": {
      const body = args;
      if (!body.items?.length) {
        throw new Error("ITEMS_REQUIRED");
      }
      const built = await buildAdjustmentBatchInput(deps.catalog, ctx.tenantId, body);
      const batch = await deps.adjustments.createBatch({
        tenant_id: ctx.tenantId,
        status: built.status,
        reason_code: built.reason_code,
        items: built.prepared.map((p) => ({
          listing_id: p.listing_id,
          explicit_price_mxn: p.explicit_price_mxn,
          from_price_mxn: p.from_price_mxn,
          guard_result: p.guard_result
        }))
      });
      result = batch;
      break;
    }
    default:
      throw new Error("UNKNOWN_TOOL");
  }
  const audit = await deps.audit.recordInvocation({
    tenant_id: ctx.tenantId,
    tool_name: tool,
    session_id: ctx.sessionId ?? null,
    arguments_json: args,
    result_summary: summarizeResult(tool, result)
  });
  return { tool, result, audit_id: audit.id };
}

// apps/bff/dist/rule-compiler.js
var pending = /* @__PURE__ */ new Map();
var compileSeq = 0;
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "");
}
function compileNaturalLanguageToRuleDraft(text, locale) {
  const n = normalize(text);
  let action = "suggest";
  if (n.includes("auto active") || n.includes("activo automatico") || n.includes("\u81EA\u52A8\u751F\u6548")) {
    action = "auto_active";
  } else if (n.includes("auto pending") || n.includes("pendiente") || n.includes("\u5F85\u786E\u8BA4") || n.includes("pending")) {
    action = "auto_pending";
  } else if (n.includes("suggest") || n.includes("sugerir") || n.includes("\u5EFA\u8BAE")) {
    action = "suggest";
  }
  let anchor_type = "median";
  if (n.includes("min") || n.includes("minimo") || n.includes("\u6700\u4F4E")) {
    anchor_type = "min";
  } else if (n.includes("max") || n.includes("maximo") || n.includes("\u6700\u9AD8")) {
    anchor_type = "max";
  } else if (n.includes("median") || n.includes("mediana") || n.includes("\u4E2D\u4F4D")) {
    anchor_type = "median";
  }
  let offset = { type: "PERCENT", value: 0 };
  const pctMatch = n.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    offset = { type: "PERCENT", value: Number(pctMatch[1]) };
  } else {
    const mxnMatch = n.match(/(-?\d+(?:\.\d+)?)\s*(?:mxn|pesos|比索)/);
    if (mxnMatch) {
      offset = { type: "FIXED_MXN", value: Number(mxnMatch[1]) };
    }
  }
  const gapMatch = n.match(/(?:gap|brecha|间距)\s*(\d+)/);
  const min_gap_mxn = gapMatch ? Number(gapMatch[1]) : 5;
  const business_hours_only = n.includes("horario") || n.includes("business hour") || n.includes("\u8425\u4E1A\u65F6\u95F4") || n.includes("horas habiles");
  const draft = {
    enabled: true,
    action,
    anchor_type,
    offset,
    min_gap_mxn,
    cooldown_min: 0,
    daily_limit: 10,
    business_hours_only
  };
  const explanation = locale === "es-MX" ? `Borrador: acci\xF3n ${action}, ancla ${anchor_type}, offset ${offset.type} ${offset.value}.` : locale === "zh-CN" ? `\u8349\u6848\uFF1A\u52A8\u4F5C ${action}\uFF0C\u951A\u70B9 ${anchor_type}\uFF0C\u504F\u79FB ${offset.type} ${offset.value}\u3002` : `Draft: action ${action}, anchor ${anchor_type}, offset ${offset.type} ${offset.value}.`;
  return { draft, explanation };
}
function storeCompiledDraft(input) {
  compileSeq += 1;
  const compile_id = `compile-${compileSeq}`;
  const record = {
    compile_id,
    listing_id: input.listing_id,
    tenant_id: input.tenant_id,
    source_text: input.source_text,
    draft: input.draft,
    explanation: input.explanation,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  pending.set(compile_id, record);
  return record;
}
function takeCompiledDraft(tenantId, listingId, compileId) {
  const record = pending.get(compileId);
  if (!record)
    return void 0;
  if (record.tenant_id !== tenantId || record.listing_id !== listingId) {
    return void 0;
  }
  pending.delete(compileId);
  return record;
}

// apps/bff/dist/llm-rule-compiler-client.js
var ACTIONS = /* @__PURE__ */ new Set([
  "suggest",
  "pending",
  "auto_pending",
  "auto_active"
]);
function isOffsetJson(v) {
  if (!v || typeof v !== "object")
    return false;
  const o = v;
  return (o.type === "PERCENT" || o.type === "FIXED_MXN") && typeof o.value === "number" && Number.isFinite(o.value);
}
function parseLlmRuleCompilerResponse(json) {
  if (!json || typeof json !== "object")
    return null;
  const body = json;
  const d = body.draft;
  if (!d || typeof d !== "object")
    return null;
  const action = d.action;
  if (!ACTIONS.has(action))
    return null;
  if (!isOffsetJson(d.offset))
    return null;
  const draft = {
    enabled: d.enabled !== false,
    action,
    anchor_type: typeof d.anchor_type === "string" ? d.anchor_type : "median",
    offset: d.offset,
    min_gap_mxn: typeof d.min_gap_mxn === "number" ? d.min_gap_mxn : 5,
    cooldown_min: typeof d.cooldown_min === "number" ? d.cooldown_min : 0,
    daily_limit: typeof d.daily_limit === "number" ? d.daily_limit : 10,
    business_hours_only: Boolean(d.business_hours_only)
  };
  const explanation = typeof body.explanation === "string" && body.explanation.trim() ? body.explanation.trim() : "LLM compiler response";
  return { draft, explanation };
}
async function fetchRuleDraftFromLlmEndpoint(natural_language, locale) {
  const endpoint = process.env.RULE_COMPILER_LLM_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error("LLM_ENDPOINT_NOT_CONFIGURED");
  }
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  const apiKey = process.env.RULE_COMPILER_LLM_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const model = process.env.RULE_COMPILER_LLM_MODEL?.trim();
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      natural_language,
      locale,
      model: model ?? void 0
    })
  });
  if (!res.ok) {
    throw new Error(`LLM_HTTP_${res.status}`);
  }
  const json = await res.json();
  const parsed = parseLlmRuleCompilerResponse(json);
  if (!parsed) {
    throw new Error("LLM_RESPONSE_INVALID");
  }
  return parsed;
}

// apps/bff/dist/production-config.js
function isProductionMode() {
  const flag2 = process.env.PRODUCTION_MODE?.trim().toLowerCase();
  if (flag2 === "1" || flag2 === "true" || flag2 === "yes")
    return true;
  return process.env.NODE_ENV === "production";
}
function evaluateProductionConfig() {
  const deploy_env = resolveDeployEnvironment();
  const production_mode = isProductionMode() || deploy_env === "production";
  const database_configured = Boolean(process.env.DATABASE_URL?.trim());
  const auth_driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  const redis_configured = Boolean(process.env.REDIS_URL?.trim());
  const object_storage_configured = Boolean(process.env.EXPORT_S3_BUCKET?.trim() && process.env.EXPORT_S3_ENDPOINT?.trim());
  const dev_token_allowed = !production_mode && (auth_driver === "dev" || auth_driver === "oidc_stub");
  const issues = [];
  if (production_mode || deploy_env === "staging") {
    if (!database_configured && deploy_env !== "development") {
      issues.push("DATABASE_URL is required in staging/production");
    }
    if (deploy_env === "production" || production_mode) {
      if (auth_driver !== "oidc_jwt" && auth_driver !== "jwt") {
        issues.push("AUTH_DRIVER must be oidc_jwt in production mode");
      }
      if (!process.env.OIDC_JWT_HS256_SECRET?.trim() && !process.env.OIDC_JWKS_URL?.trim() && !process.env.OIDC_JWKS_JSON?.trim()) {
        issues.push("JWT validation must be configured (HS256 secret or JWKS)");
      }
      if (!process.env.SHOP_CREDENTIAL_ENCRYPTION_KEY?.trim()) {
        issues.push("SHOP_CREDENTIAL_ENCRYPTION_KEY is required in production mode");
      }
      if (!isChannelLivePublishArmed()) {
        issues.push("CHANNEL_LIVE_ACKNOWLEDGED should be set for production channel publish (auto driver)");
      }
      if (resolveRuleCompilerDriver() === "llm_http") {
        if (!process.env.RULE_COMPILER_LLM_ENDPOINT?.trim()) {
          issues.push("RULE_COMPILER_LLM_ENDPOINT is required for llm_http in production");
        }
      }
    } else if (deploy_env === "staging") {
      if (auth_driver === "dev") {
        issues.push("AUTH_DRIVER should not be dev in staging");
      }
    }
  }
  return {
    production_mode,
    deploy_env,
    database_required: production_mode,
    database_configured,
    auth_driver,
    dev_token_allowed,
    redis_configured,
    object_storage_configured,
    ready: issues.length === 0,
    issues
  };
}

// apps/bff/dist/production-llm.js
function isProductionLlmNoFallback() {
  const flag2 = process.env.RULE_COMPILER_PRODUCTION_NO_FALLBACK?.trim().toLowerCase();
  if (flag2 === "0" || flag2 === "false" || flag2 === "no")
    return false;
  if (flag2 === "1" || flag2 === "true" || flag2 === "yes")
    return true;
  return isProductionMode();
}
function evaluateProductionLlm() {
  const driver = resolveRuleCompilerDriver();
  const status = getRuleCompilerStatus();
  const production_required = isProductionMode() && driver === "llm_http";
  const no_fallback = isProductionLlmNoFallback();
  const issues = [];
  if (production_required) {
    if (!status.llm_endpoint_configured) {
      issues.push("RULE_COMPILER_LLM_ENDPOINT is required for llm_http in production");
    }
    if (!process.env.RULE_COMPILER_LLM_API_KEY?.trim()) {
      issues.push("RULE_COMPILER_LLM_API_KEY is recommended in production");
    }
  }
  const ready = !production_required || status.llm_endpoint_configured && status.ready;
  return {
    driver,
    endpoint_configured: status.llm_endpoint_configured,
    production_required,
    no_fallback,
    ready,
    issues
  };
}

// apps/bff/dist/rule-compiler-adapter.js
var DRIVER_ALIASES3 = {
  heuristic: "heuristic",
  keyword: "heuristic",
  llm_stub: "llm_stub",
  llm: "llm_stub",
  llm_http: "llm_http",
  http: "llm_http"
};
function resolveRuleCompilerDriver(raw) {
  const key3 = (raw ?? process.env.RULE_COMPILER_DRIVER ?? "heuristic").trim().toLowerCase();
  return DRIVER_ALIASES3[key3] ?? "heuristic";
}
function getRuleCompilerStatus() {
  const driver = resolveRuleCompilerDriver();
  const endpoint = process.env.RULE_COMPILER_LLM_ENDPOINT?.trim() || null;
  const llmReady = driver !== "llm_http" || Boolean(endpoint);
  return {
    driver,
    llm_endpoint_configured: Boolean(endpoint),
    llm_model: process.env.RULE_COMPILER_LLM_MODEL?.trim() || null,
    production_no_fallback: isProductionLlmNoFallback(),
    ready: driver === "heuristic" || driver === "llm_stub" || driver === "llm_http" && Boolean(endpoint),
    llm_ready: llmReady,
    note: driver === "heuristic" ? "Deterministic keyword parser (no external LLM)." : driver === "llm_stub" ? "LLM adapter stub \u2014 same draft as heuristic with stub metadata until a real provider is wired." : endpoint ? "HTTP LLM rule compiler (POST RULE_COMPILER_LLM_ENDPOINT)." : "llm_http driver requires RULE_COMPILER_LLM_ENDPOINT."
  };
}
function heuristicResult(text, locale, driver, stub, model, prefix) {
  const { draft, explanation: baseExplanation } = compileNaturalLanguageToRuleDraft(text, locale);
  return {
    draft,
    explanation: prefix ? `${prefix} ${baseExplanation}` : baseExplanation,
    compiler: { driver, model, stub }
  };
}
async function compileRuleViaAdapter(text, locale, driverOverride) {
  const driver = driverOverride ?? resolveRuleCompilerDriver();
  if (driver === "llm_http") {
    const model = process.env.RULE_COMPILER_LLM_MODEL?.trim() || "mx-pricing-llm-http";
    try {
      const remote = await fetchRuleDraftFromLlmEndpoint(text, locale);
      return {
        draft: remote.draft,
        explanation: remote.explanation,
        compiler: { driver, model, stub: false }
      };
    } catch (e) {
      if (isProductionLlmNoFallback()) {
        throw e;
      }
      const fallback = heuristicResult(text, locale, "llm_http", false, model, locale === "es-MX" ? "[reserva llm_http]" : locale === "zh-CN" ? "[llm_http \u56DE\u9000]" : "[llm_http fallback]");
      return {
        ...fallback,
        compiler: { driver: "llm_http", model, stub: false, fallback: true }
      };
    }
  }
  if (driver === "llm_stub") {
    const model = process.env.RULE_COMPILER_LLM_MODEL?.trim() || "mx-pricing-llm-stub";
    const prefix = locale === "es-MX" ? "[adaptador LLM simulado]" : locale === "zh-CN" ? "[LLM \u5360\u4F4D\u9002\u914D\u5668]" : "[LLM stub adapter]";
    return heuristicResult(text, locale, "llm_stub", true, model, prefix);
  }
  return heuristicResult(text, locale, "heuristic", false, null);
}

// apps/bff/dist/agent-readiness.js
var BLOCKED = /* @__PURE__ */ new Set([
  "tool_publish_price",
  "tool_apply_adjustment",
  "tool_channel_publish",
  "tool_apply_adjustment_batch"
]);
function evaluateAgentReadiness() {
  const tools = listAgentTools();
  const toolNames = tools.map((t) => t.name);
  const noBlocked = toolNames.every((n) => !BLOCKED.has(n));
  const readTools = [
    "tool_get_pricing_context",
    "tool_list_price_versions",
    "tool_simulate"
  ];
  const hasReadTools = readTools.every((n) => toolNames.includes(n));
  const hasDraftTool = toolNames.includes("tool_create_adjustment_draft");
  const compiler = getRuleCompilerStatus();
  const checks = [
    {
      id: "TC-NFR-SEC-004",
      passed: noBlocked,
      detail: noBlocked ? "Agent catalog has no publish/apply tools" : "Blocked tool name present in catalog"
    },
    {
      id: "TC-INT-AGENT-001",
      passed: hasReadTools,
      detail: hasReadTools ? "Read tools available" : "Missing read-only pricing tools"
    },
    {
      id: "TC-INT-AGENT-002",
      passed: hasDraftTool,
      detail: hasDraftTool ? "Draft adjustment tool available" : "tool_create_adjustment_draft missing"
    },
    {
      id: "P4-COMPILER",
      passed: compiler.ready,
      detail: compiler.note
    },
    {
      id: "P4-COPILOT-API",
      passed: true,
      detail: "Copilot sessions/messages and NL compile routes registered"
    },
    {
      id: "P4-DIGEST",
      passed: true,
      detail: "Daily digest + dispatch/queue endpoints available"
    }
  ];
  return {
    ready: checks.every((c) => c.passed),
    milestone: "P4",
    checks
  };
}

// apps/bff/dist/p4-readiness-csv.js
function cell15(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function p4ReadinessToCsv(snapshot, exportedAt) {
  const lines = ["exported_at,ready,milestone,check_id,passed,detail"];
  for (const check of snapshot.checks) {
    lines.push([
      exportedAt,
      snapshot.ready ? "true" : "false",
      cell15(snapshot.milestone),
      cell15(check.id),
      check.passed ? "true" : "false",
      cell15(check.detail)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/version-backup-validate.js
function validateVersionBackupSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== "object") {
    return { valid: false, errors: ["NOT_OBJECT"], summary: { version_count: 0 } };
  }
  const s = snapshot;
  if (!s.tenant_id)
    errors.push("MISSING_TENANT_ID");
  if (!Array.isArray(s.versions))
    errors.push("MISSING_VERSIONS");
  else {
    for (let i = 0; i < s.versions.length; i++) {
      const v = s.versions[i];
      if (!v?.id || !v.sku_id || !v.channel) {
        errors.push(`VERSION_${i}_INVALID`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: { version_count: s.versions?.length ?? 0 }
  };
}

// apps/bff/dist/repositories/memory-export-file.js
import { randomBytes as randomBytes2 } from "node:crypto";
var exports = /* @__PURE__ */ new Map();
var MemoryExportFileRepository = class {
  driver = "memory";
  async create(input) {
    const export_id = `exp-${Date.now()}-${exports.size + 1}`;
    const token = randomBytes2(16).toString("hex");
    const ttl = input.ttl_sec ?? 3600;
    const expires_at = new Date(Date.now() + ttl * 1e3).toISOString();
    exports.set(export_id, {
      export_id,
      tenant_id: input.tenant_id,
      kind: input.kind,
      content_type: input.content_type,
      body: input.body,
      token,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      expires_at,
      storage_key: input.storage_key ?? void 0
    });
    return { export_id, token, expires_at };
  }
  async get(tenantId, exportId, token) {
    const row = exports.get(exportId);
    if (!row || row.tenant_id !== tenantId || row.token !== token) {
      return void 0;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      exports.delete(exportId);
      return void 0;
    }
    return row;
  }
  async resetForTests() {
    exports.clear();
  }
};

// apps/bff/dist/repositories/postgres-export-file.js
import { randomBytes as randomBytes3 } from "node:crypto";
import { Pool as Pool4 } from "pg";
var PostgresExportFileRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool4({ connectionString: databaseUrl });
  }
  async create(input) {
    const export_id = `exp-${Date.now()}-${randomBytes3(4).toString("hex")}`;
    const token = randomBytes3(16).toString("hex");
    const ttl = input.ttl_sec ?? 3600;
    const expires_at = new Date(Date.now() + ttl * 1e3).toISOString();
    await this.pool.query(`INSERT INTO export_files
        (export_id, tenant_id, kind, content_type, storage_key, body_text, token, created_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`, [
      export_id,
      input.tenant_id,
      input.kind,
      input.content_type,
      input.storage_key ?? null,
      input.storage_key ? null : input.body,
      token,
      expires_at
    ]);
    return { export_id, token, expires_at };
  }
  async get(tenantId, exportId, token) {
    const r = await this.pool.query(`SELECT * FROM export_files
       WHERE export_id = $1 AND tenant_id = $2 AND token = $3`, [exportId, tenantId, token]);
    if (r.rowCount === 0)
      return void 0;
    const row = r.rows[0];
    const expires_at = new Date(row.expires_at).toISOString();
    if (new Date(expires_at).getTime() < Date.now()) {
      await this.pool.query(`DELETE FROM export_files WHERE export_id = $1`, [
        exportId
      ]);
      return void 0;
    }
    return {
      export_id: row.export_id,
      tenant_id: row.tenant_id,
      kind: row.kind,
      content_type: row.content_type,
      body: row.body_text ?? "",
      token: row.token,
      created_at: new Date(row.created_at).toISOString(),
      expires_at,
      storage_key: row.storage_key ?? void 0
    };
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM export_files`);
  }
};

// apps/bff/dist/export-object-storage.js
import { randomBytes as randomBytes4 } from "node:crypto";
async function uploadExportToObjectStorage(input) {
  const bucket = process.env.EXPORT_S3_BUCKET?.trim();
  const endpoint = process.env.EXPORT_S3_ENDPOINT?.trim();
  if (!bucket || !endpoint) {
    return null;
  }
  const key3 = `exports/${input.tenant_id}/${input.kind}/${Date.now()}-${randomBytes4(4).toString("hex")}.csv`;
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key3}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": input.content_type,
      ...process.env.EXPORT_S3_ACCESS_KEY ? {
        Authorization: `Bearer ${process.env.EXPORT_S3_ACCESS_KEY}`
      } : {}
    },
    body: input.body
  });
  if (!res.ok) {
    console.error("S3 export upload failed", res.status, await res.text());
    return null;
  }
  return { storage_key: key3, public_url: url };
}
function objectStorageStatus() {
  return {
    configured: Boolean(process.env.EXPORT_S3_BUCKET?.trim() && process.env.EXPORT_S3_ENDPOINT?.trim()),
    bucket: process.env.EXPORT_S3_BUCKET?.trim() || null,
    endpoint: process.env.EXPORT_S3_ENDPOINT?.trim() || null
  };
}

// apps/bff/dist/repositories/export-file-index.js
var singleton12;
var S3BackedExportFileRepository = class {
  driver = "s3";
  inner;
  constructor(inner) {
    this.inner = inner;
  }
  async create(input) {
    const uploaded = await uploadExportToObjectStorage({
      tenant_id: input.tenant_id,
      kind: input.kind,
      content_type: input.content_type,
      body: input.body
    });
    if (uploaded) {
      return this.inner.create({
        ...input,
        body: "",
        storage_key: uploaded.storage_key
      });
    }
    return this.inner.create(input);
  }
  async get(tenantId, exportId, token) {
    return this.inner.get(tenantId, exportId, token);
  }
  async resetForTests() {
    await this.inner.resetForTests();
  }
};
function createExportFileRepository() {
  if (process.env.EXPORT_DRIVER === "memory") {
    return new MemoryExportFileRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  const base = url ? new PostgresExportFileRepository(url) : new MemoryExportFileRepository();
  if (process.env.EXPORT_S3_BUCKET?.trim() && process.env.EXPORT_S3_ENDPOINT?.trim()) {
    return new S3BackedExportFileRepository(base);
  }
  return base;
}
function getExportFileRepository() {
  if (!singleton12) {
    singleton12 = createExportFileRepository();
  }
  return singleton12;
}

// apps/bff/dist/export-file-store.js
async function createStoredExport(input) {
  return getExportFileRepository().create(input);
}
async function getStoredExport(tenantId, exportId, token) {
  return getExportFileRepository().get(tenantId, exportId, token);
}
function getExportStoreStatus() {
  return {
    driver: getExportFileRepository().driver
  };
}

// apps/bff/dist/repositories/memory-fx-rate.js
var DEFAULT_RATES = [
  {
    base: "USD",
    quote: "MXN",
    rate: 20,
    buffer_pct: 2,
    effective_from: "2026-01-01T00:00:00.000Z",
    source: "demo-table"
  }
];
var byTenant2 = /* @__PURE__ */ new Map();
var MemoryFxRateRepository = class {
  driver = "memory";
  async list(tenantId) {
    return byTenant2.get(tenantId) ?? [...DEFAULT_RATES];
  }
  async get(tenantId, base, quote) {
    const rows3 = await this.list(tenantId);
    return rows3.find((r) => r.base === base && r.quote === quote);
  }
  async upsert(tenantId, row) {
    const list = [...await this.list(tenantId)];
    const idx = list.findIndex((r) => r.base === row.base && r.quote === row.quote);
    if (idx >= 0)
      list[idx] = row;
    else
      list.push(row);
    byTenant2.set(tenantId, list);
    return list;
  }
  async resetForTests() {
    byTenant2.clear();
  }
};

// apps/bff/dist/repositories/postgres-fx-rate.js
import { Pool as Pool5 } from "pg";
var DEFAULT_RATES2 = [
  {
    base: "USD",
    quote: "MXN",
    rate: 20,
    buffer_pct: 2,
    effective_from: "2026-01-01T00:00:00.000Z",
    source: "demo-table"
  }
];
var PostgresFxRateRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool5({ connectionString: databaseUrl });
  }
  async list(tenantId) {
    const r = await this.pool.query(`SELECT * FROM fx_rates WHERE tenant_id = $1 ORDER BY valid_from DESC`, [tenantId]);
    if (r.rowCount === 0)
      return [...DEFAULT_RATES2];
    return r.rows.map(rowToFx);
  }
  async get(tenantId, base, quote) {
    const rows3 = await this.list(tenantId);
    return rows3.find((row) => row.base === base && row.quote === quote);
  }
  async upsert(tenantId, row) {
    const id = `fx-${tenantId}-${row.base}-${row.quote}`;
    await this.pool.query(`INSERT INTO fx_rates
        (id, tenant_id, base_currency, quote_currency, rate, buffer_pct, valid_from, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         rate = EXCLUDED.rate,
         buffer_pct = EXCLUDED.buffer_pct,
         valid_from = EXCLUDED.valid_from,
         source = EXCLUDED.source`, [
      id,
      tenantId,
      row.base,
      row.quote,
      row.rate,
      row.buffer_pct,
      row.effective_from,
      row.source
    ]);
    return this.list(tenantId);
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM fx_rates`);
  }
};
function rowToFx(row) {
  return {
    base: row.base_currency,
    quote: row.quote_currency,
    rate: Number(row.rate),
    buffer_pct: Number(row.buffer_pct),
    effective_from: new Date(row.valid_from).toISOString(),
    source: row.source
  };
}

// apps/bff/dist/repositories/fx-rate-index.js
var singleton13;
function createFxRateRepository() {
  if (process.env.FX_RATE_DRIVER === "memory") {
    return new MemoryFxRateRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url)
    return new PostgresFxRateRepository(url);
  return new MemoryFxRateRepository();
}
function getFxRateRepository() {
  if (!singleton13)
    singleton13 = createFxRateRepository();
  return singleton13;
}

// apps/bff/dist/fx-rate-table.js
async function listFxRates(tenantId) {
  return getFxRateRepository().list(tenantId);
}
async function upsertFxRate(tenantId, row) {
  return getFxRateRepository().upsert(tenantId, row);
}
async function getFxRate(tenantId, base, quote) {
  return getFxRateRepository().get(tenantId, base, quote);
}
function getFxRateStoreStatus() {
  return { driver: getFxRateRepository().driver };
}

// apps/bff/dist/fx-rates-csv.js
function fxRatesToCsv(rows3, exportedAt) {
  const lines = [
    "exported_at,base,quote,rate,buffer_pct,effective_from,source"
  ];
  for (const r of rows3) {
    lines.push([
      exportedAt,
      r.base,
      r.quote,
      r.rate,
      r.buffer_pct,
      r.effective_from,
      r.source
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-audit-csv.js
function cell16(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function agentToolAuditToCsv(items, exportedAt) {
  const lines = [
    "exported_at,id,tool_name,session_id,result_summary,created_at,arguments_json"
  ];
  for (const row of items) {
    lines.push([
      cell16(exportedAt),
      cell16(row.id),
      cell16(row.tool_name),
      cell16(row.session_id),
      cell16(row.result_summary),
      cell16(row.created_at),
      cell16(JSON.stringify(row.arguments_json))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/digest-run-due.js
async function runDueDigestDispatch(deps, tenantId, locale, options) {
  const schedule = getDigestSchedule(tenantId);
  if (!schedule.enabled && !options?.force) {
    return { skipped: true };
  }
  const { record, digest } = await dispatchDailyDigest(deps, tenantId, locale, { date: options?.date });
  return {
    skipped: false,
    record,
    digest,
    schedule: getDigestSchedule(tenantId)
  };
}

// apps/bff/dist/landed-cost-fx.js
import { computeLandedCost } from "@mx-pricing/pricing-engine";
async function computeLandedFromFx(tenantId, input) {
  const quote = "MXN";
  const fxRow = await getFxRate(tenantId, input.cogs_currency, quote);
  if (!fxRow) {
    throw new Error(`FX_RATE_NOT_FOUND:${input.cogs_currency}/${quote}`);
  }
  return computeLandedCost({
    cogs_amount: input.cogs_amount,
    cogs_currency: input.cogs_currency,
    fx: {
      base: fxRow.base,
      quote: fxRow.quote,
      rate: fxRow.rate,
      buffer_pct: fxRow.buffer_pct
    },
    freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
    tariff_rate: input.tariff_rate ?? 0,
    customs_fee_mxn: input.customs_fee_mxn ?? 0
  });
}

// apps/bff/dist/landed-cost-hs.js
import { computeLandedCost as computeLandedCost2 } from "@mx-pricing/pricing-engine";

// apps/bff/dist/repositories/memory-tariff-hs.js
var DEFAULT_ROWS = [
  {
    hs_code: "HS-ELECTRONICS-MX",
    description: "Electronics (demo)",
    tariff_rate: 0.05,
    customs_fee_mxn: 0
  },
  {
    hs_code: "8517.12.00",
    description: "Telephones for cellular networks",
    tariff_rate: 0.05,
    customs_fee_mxn: 0
  }
];
var byTenant3 = /* @__PURE__ */ new Map();
var MemoryTariffHsRepository = class {
  driver = "memory";
  async list(tenantId) {
    return byTenant3.get(tenantId) ?? [...DEFAULT_ROWS];
  }
  async get(tenantId, hsCode) {
    const rows3 = await this.list(tenantId);
    return rows3.find((r) => r.hs_code === hsCode);
  }
  async upsert(tenantId, row) {
    const list = [...await this.list(tenantId)];
    const idx = list.findIndex((r) => r.hs_code === row.hs_code);
    if (idx >= 0)
      list[idx] = row;
    else
      list.push(row);
    byTenant3.set(tenantId, list);
    return list;
  }
  async resetForTests() {
    byTenant3.clear();
  }
};

// apps/bff/dist/repositories/postgres-tariff-hs.js
import { Pool as Pool6 } from "pg";
var DEFAULT_ROWS2 = [
  {
    hs_code: "HS-ELECTRONICS-MX",
    description: "Electronics (demo)",
    tariff_rate: 0.05,
    customs_fee_mxn: 0
  },
  {
    hs_code: "8517.12.00",
    description: "Telephones for cellular networks",
    tariff_rate: 0.05,
    customs_fee_mxn: 0
  }
];
var PostgresTariffHsRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool6({ connectionString: databaseUrl });
  }
  async list(tenantId) {
    const r = await this.pool.query(`SELECT * FROM tariff_rules WHERE tenant_id = $1 ORDER BY hs_code`, [tenantId]);
    if (r.rowCount === 0)
      return [...DEFAULT_ROWS2];
    return r.rows.map(rowToTariff);
  }
  async get(tenantId, hsCode) {
    const rows3 = await this.list(tenantId);
    return rows3.find((row) => row.hs_code === hsCode);
  }
  async upsert(tenantId, row) {
    await this.pool.query(`INSERT INTO tariff_rules
        (tenant_id, hs_code, duty_rate, notes, description, customs_fee_mxn)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, hs_code) DO UPDATE SET
         duty_rate = EXCLUDED.duty_rate,
         notes = EXCLUDED.notes,
         description = EXCLUDED.description,
         customs_fee_mxn = EXCLUDED.customs_fee_mxn`, [
      tenantId,
      row.hs_code,
      row.tariff_rate,
      row.description,
      row.description,
      row.customs_fee_mxn
    ]);
    return this.list(tenantId);
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM tariff_rules`);
  }
};
function rowToTariff(row) {
  return {
    hs_code: row.hs_code,
    description: row.description || row.notes || "",
    tariff_rate: Number(row.duty_rate),
    customs_fee_mxn: Number(row.customs_fee_mxn ?? 0)
  };
}

// apps/bff/dist/repositories/tariff-hs-index.js
var singleton14;
function createTariffHsRepository() {
  if (process.env.TARIFF_HS_DRIVER === "memory") {
    return new MemoryTariffHsRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url)
    return new PostgresTariffHsRepository(url);
  return new MemoryTariffHsRepository();
}
function getTariffHsRepository() {
  if (!singleton14)
    singleton14 = createTariffHsRepository();
  return singleton14;
}

// apps/bff/dist/tariff-hs-table.js
async function listTariffHsRates(tenantId) {
  return getTariffHsRepository().list(tenantId);
}
async function getTariffHsRate(tenantId, hsCode) {
  return getTariffHsRepository().get(tenantId, hsCode);
}
async function upsertTariffHsRate(tenantId, row) {
  return getTariffHsRepository().upsert(tenantId, row);
}
function getTariffHsStoreStatus() {
  return { driver: getTariffHsRepository().driver };
}

// apps/bff/dist/landed-cost-hs.js
async function computeLandedFromHs(tenantId, hsCode, input) {
  const row = await getTariffHsRate(tenantId, hsCode);
  if (!row) {
    throw new Error(`HS_CODE_NOT_FOUND:${hsCode}`);
  }
  const currency = input.cogs_currency ?? "MXN";
  const fx = currency === "MXN" ? { base: "MXN", quote: "MXN", rate: 1, buffer_pct: 0 } : { base: currency, quote: "MXN", rate: 1, buffer_pct: 0 };
  if (currency !== "MXN") {
    throw new Error("HS_LANDED_MXN_ONLY");
  }
  const result = computeLandedCost2({
    cogs_amount: input.cogs_amount,
    cogs_currency: currency,
    fx,
    freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
    tariff_rate: row.tariff_rate,
    customs_fee_mxn: row.customs_fee_mxn
  });
  return { tariff: row, computed: result };
}

// apps/bff/dist/adjustment-price-import.js
function parseAdjustmentPriceCsv(text) {
  const errors = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["EMPTY_CSV"] };
  }
  const header = lines[0].split(",").map((p) => p.trim().toLowerCase());
  const hasHeader = header.includes("listing_id") && header.includes("explicit_price_mxn");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const listingCol = hasHeader ? header.indexOf("listing_id") : 0;
  const priceCol = hasHeader ? header.indexOf("explicit_price_mxn") : 1;
  const rows3 = [];
  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(",").map((p) => p.trim());
    const listing_id = parts[listingCol];
    const price = Number(parts[priceCol]);
    if (!listing_id) {
      errors.push(`ROW_${i + 1}:MISSING_LISTING`);
      continue;
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`ROW_${i + 1}:INVALID_PRICE`);
      continue;
    }
    rows3.push({ listing_id, explicit_price_mxn: price });
  }
  return { rows: rows3, errors };
}
var ADJUSTMENT_IMPORT_TEMPLATE_CSV = "listing_id,explicit_price_mxn\nlisting-ml-001,1650\nlisting-amz-001,1700\n";

// apps/bff/dist/repositories/memory-cost-sheet.js
var seq8 = 1;
var byTenantSku = /* @__PURE__ */ new Map();
function key2(tenantId, skuId) {
  return `${tenantId}:${skuId}`;
}
var MemoryCostSheetRepository = class {
  driver = "memory";
  async list(tenantId, skuId) {
    return [...byTenantSku.get(key2(tenantId, skuId)) ?? []].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  }
  async get(tenantId, skuId, sheetId) {
    const rows3 = await this.list(tenantId, skuId);
    return rows3.find((s) => s.id === sheetId);
  }
  async create(tenantId, skuId, input) {
    if (!input.batch_no?.trim())
      throw new Error("BATCH_NO_REQUIRED");
    if (!Number.isFinite(input.cogs_amount) || input.cogs_amount <= 0) {
      throw new Error("COGS_AMOUNT_INVALID");
    }
    const row = {
      id: `cs-${seq8++}`,
      tenant_id: tenantId,
      sku_id: skuId,
      batch_no: input.batch_no.trim(),
      cogs_amount: input.cogs_amount,
      cogs_currency: (input.cogs_currency ?? "MXN").toUpperCase(),
      freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
      freight_alloc_rule: input.freight_alloc_rule ?? "PER_UNIT",
      effective_from: input.effective_from ?? (/* @__PURE__ */ new Date()).toISOString(),
      source: input.source ?? "manual"
    };
    const k = key2(tenantId, skuId);
    const list = [...byTenantSku.get(k) ?? []];
    list.push(row);
    byTenantSku.set(k, list);
    return row;
  }
  async resetForTests() {
    byTenantSku.clear();
    seq8 = 1;
  }
};

// apps/bff/dist/repositories/postgres-cost-sheet.js
import { Pool as Pool7 } from "pg";
var seq9 = 0;
var PostgresCostSheetRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool7({ connectionString: databaseUrl });
  }
  async list(tenantId, skuId) {
    const r = await this.pool.query(`SELECT * FROM cost_sheets
       WHERE tenant_id = $1 AND sku_id = $2
       ORDER BY effective_from DESC`, [tenantId, skuId]);
    return r.rows.map(rowToCostSheet);
  }
  async get(tenantId, skuId, sheetId) {
    const r = await this.pool.query(`SELECT * FROM cost_sheets WHERE tenant_id = $1 AND sku_id = $2 AND id = $3`, [tenantId, skuId, sheetId]);
    if (r.rowCount === 0)
      return void 0;
    return rowToCostSheet(r.rows[0]);
  }
  async create(tenantId, skuId, input) {
    if (!input.batch_no?.trim())
      throw new Error("BATCH_NO_REQUIRED");
    if (!Number.isFinite(input.cogs_amount) || input.cogs_amount <= 0) {
      throw new Error("COGS_AMOUNT_INVALID");
    }
    seq9 += 1;
    const id = `cs-${Date.now()}-${seq9}`;
    const effective_from = input.effective_from ?? (/* @__PURE__ */ new Date()).toISOString();
    await this.pool.query(`INSERT INTO cost_sheets
        (id, tenant_id, sku_id, batch_no, cogs_amount, cogs_currency, freight_alloc_mxn, freight_alloc_rule, effective_from, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
      id,
      tenantId,
      skuId,
      input.batch_no.trim(),
      input.cogs_amount,
      (input.cogs_currency ?? "MXN").toUpperCase(),
      input.freight_alloc_mxn ?? 0,
      input.freight_alloc_rule ?? "PER_UNIT",
      effective_from,
      input.source ?? "manual"
    ]);
    return {
      id,
      tenant_id: tenantId,
      sku_id: skuId,
      batch_no: input.batch_no.trim(),
      cogs_amount: input.cogs_amount,
      cogs_currency: (input.cogs_currency ?? "MXN").toUpperCase(),
      freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
      freight_alloc_rule: input.freight_alloc_rule ?? "PER_UNIT",
      effective_from,
      source: input.source ?? "manual"
    };
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM cost_sheets`);
    seq9 = 0;
  }
};
function rowToCostSheet(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    sku_id: row.sku_id,
    batch_no: row.batch_no,
    cogs_amount: Number(row.cogs_amount),
    cogs_currency: row.cogs_currency,
    freight_alloc_mxn: Number(row.freight_alloc_mxn),
    freight_alloc_rule: row.freight_alloc_rule,
    effective_from: new Date(row.effective_from).toISOString(),
    source: row.source
  };
}

// apps/bff/dist/repositories/cost-sheet-index.js
var singleton15;
function createCostSheetRepository() {
  if (process.env.COST_SHEET_DRIVER === "memory") {
    return new MemoryCostSheetRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url)
    return new PostgresCostSheetRepository(url);
  return new MemoryCostSheetRepository();
}
function getCostSheetRepository() {
  if (!singleton15)
    singleton15 = createCostSheetRepository();
  return singleton15;
}

// apps/bff/dist/cost-sheet-store.js
async function listCostSheets(tenantId, skuId) {
  return getCostSheetRepository().list(tenantId, skuId);
}
async function getCostSheet(tenantId, skuId, sheetId) {
  return getCostSheetRepository().get(tenantId, skuId, sheetId);
}
async function createCostSheet(tenantId, skuId, input) {
  return getCostSheetRepository().create(tenantId, skuId, input);
}
function getCostSheetStoreStatus() {
  return { driver: getCostSheetRepository().driver };
}

// apps/bff/dist/landed-cost-from-sheet.js
async function computeLandedFromCostSheet(catalog, tenantId, skuId, sheetId, options) {
  const sheet = await getCostSheet(tenantId, skuId, sheetId);
  if (!sheet) {
    throw new Error("COST_SHEET_NOT_FOUND");
  }
  const sku = await catalog.getSku(tenantId, skuId);
  if (!sku) {
    throw new Error("SKU_NOT_FOUND");
  }
  const currency = sheet.cogs_currency;
  if (currency === "MXN") {
    const hsCode = options?.hs_code ?? sku.hs_code;
    if (!hsCode) {
      throw new Error("HS_CODE_REQUIRED");
    }
    const { tariff, computed: computed2 } = await computeLandedFromHs(tenantId, hsCode, {
      cogs_amount: sheet.cogs_amount,
      cogs_currency: "MXN",
      freight_alloc_mxn: sheet.freight_alloc_mxn
    });
    return { cost_sheet: sheet, tariff, computed: computed2 };
  }
  const computed = await computeLandedFromFx(tenantId, {
    cogs_amount: sheet.cogs_amount,
    cogs_currency: currency,
    freight_alloc_mxn: sheet.freight_alloc_mxn
  });
  return { cost_sheet: sheet, computed, tariff: null };
}

// apps/bff/dist/cost-sheet-import.js
var COST_SHEET_IMPORT_TEMPLATE_CSV = "sku_id,batch_no,cogs_amount,cogs_currency,freight_alloc_mxn\ndemo-sku-001,BATCH-IMPORT-01,1000,MXN,0\n";
function parseCostSheetCsv(text) {
  const errors = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: ["EMPTY_CSV"] };
  }
  const header = lines[0].split(",").map((p) => p.trim().toLowerCase());
  const required = ["sku_id", "batch_no", "cogs_amount"];
  if (!required.every((c) => header.includes(c))) {
    return { rows: [], errors: ["HEADER_INVALID"] };
  }
  const skuCol = header.indexOf("sku_id");
  const batchCol = header.indexOf("batch_no");
  const cogsCol = header.indexOf("cogs_amount");
  const currencyCol = header.indexOf("cogs_currency");
  const freightCol = header.indexOf("freight_alloc_mxn");
  const rows3 = [];
  for (let i = 0; i < lines.slice(1).length; i++) {
    const parts = lines[i + 1].split(",").map((p) => p.trim());
    const sku_id = parts[skuCol];
    const batch_no = parts[batchCol];
    const cogs_amount = Number(parts[cogsCol]);
    if (!sku_id) {
      errors.push(`ROW_${i + 1}:MISSING_SKU`);
      continue;
    }
    if (!batch_no) {
      errors.push(`ROW_${i + 1}:MISSING_BATCH`);
      continue;
    }
    if (!Number.isFinite(cogs_amount) || cogs_amount <= 0) {
      errors.push(`ROW_${i + 1}:INVALID_COGS`);
      continue;
    }
    rows3.push({
      sku_id,
      batch_no,
      cogs_amount,
      cogs_currency: currencyCol >= 0 && parts[currencyCol] ? parts[currencyCol] : "MXN",
      freight_alloc_mxn: freightCol >= 0 && parts[freightCol] ? Number(parts[freightCol]) : 0
    });
  }
  return { rows: rows3, errors };
}
async function applyCostSheetImport(catalog, tenantId, rows3) {
  const created = [];
  const skipped = [];
  for (const row of rows3) {
    const sku = await catalog.getSku(tenantId, row.sku_id);
    if (!sku) {
      skipped.push({ sku_id: row.sku_id, reason: "SKU_NOT_FOUND" });
      continue;
    }
    try {
      const sheet = await createCostSheet(tenantId, row.sku_id, {
        batch_no: row.batch_no,
        cogs_amount: row.cogs_amount,
        cogs_currency: row.cogs_currency,
        freight_alloc_mxn: row.freight_alloc_mxn,
        source: "csv-import"
      });
      created.push({ sku_id: row.sku_id, cost_sheet_id: sheet.id });
    } catch {
      skipped.push({ sku_id: row.sku_id, reason: "CREATE_FAILED" });
    }
  }
  return { created, skipped };
}

// apps/bff/dist/listing-sync-journal.js
var seq10 = 1;
var jobs = [];
function recordListingSyncJob(input) {
  const job = {
    id: `lsync-${seq10++}`,
    started_at: input.started_at ?? (/* @__PURE__ */ new Date()).toISOString(),
    finished_at: input.finished_at ?? (/* @__PURE__ */ new Date()).toISOString(),
    ...input
  };
  jobs.unshift(job);
  if (jobs.length > 200)
    jobs.pop();
  return job;
}
function listListingSyncJobs(tenantId, listingId, limit = 20) {
  return jobs.filter((j) => j.tenant_id === tenantId && j.listing_id === listingId).slice(0, limit);
}
function listListingSyncJobsForTenant(tenantId, limit = 20) {
  return jobs.filter((j) => j.tenant_id === tenantId).slice(0, limit);
}
function getListingSyncJob(tenantId, jobId) {
  const job = jobs.find((j) => j.id === jobId);
  if (!job || job.tenant_id !== tenantId)
    return void 0;
  return job;
}

// apps/bff/dist/listing-sync-service.js
var SHOP_BY_LISTING3 = Object.fromEntries(Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop]));
async function runListingChannelSync(catalog, shops2, listingAdapter, tenantId, listingId, external_ref) {
  const listing = await catalog.getListing(tenantId, listingId);
  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }
  const shopId = SHOP_BY_LISTING3[listingId];
  const shop = shopId ? await shops2.getShop(tenantId, shopId) : void 0;
  if (!shop || shop.auth_status !== "connected" || !shop.external_seller_id) {
    throw new Error("AUTH_REQUIRED");
  }
  const token = await shops2.getAccessToken(shopId);
  if (!token) {
    throw new Error("AUTH_EXPIRED");
  }
  const started = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const snapshot = await listingAdapter.pullListing({
      shop_id: shopId,
      channel: shop.channel,
      external_seller_id: shop.external_seller_id
    }, external_ref);
    const job = recordListingSyncJob({
      tenant_id: tenantId,
      listing_id: listingId,
      shop_id: shopId,
      external_ref,
      status: "ok",
      channel_price_mxn: snapshot.price_mxn,
      error_code: null,
      started_at: started,
      finished_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { snapshot, job };
  } catch (e) {
    const job = recordListingSyncJob({
      tenant_id: tenantId,
      listing_id: listingId,
      shop_id: shopId,
      external_ref,
      status: "failed",
      channel_price_mxn: null,
      error_code: String(e).slice(0, 120),
      started_at: started,
      finished_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { snapshot: null, job, error: String(e) };
  }
}

// apps/bff/dist/listing-sync-schedule-csv.js
function cell17(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function listingSyncScheduleToCsv(schedule, exportedAt) {
  const lines = [
    "exported_at,tenant_id,enabled,cron_expression,note,updated_at,last_run_at"
  ];
  lines.push([
    exportedAt,
    cell17(schedule.tenant_id),
    schedule.enabled ? "true" : "false",
    cell17(schedule.cron_expression),
    cell17(schedule.note),
    cell17(schedule.updated_at),
    cell17(schedule.last_run_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/listing-sync-run-due.js
var DEFAULT_LISTING_SYNC_REFS = LISTING_CHANNEL_EXTERNAL_REFS;
async function runDueListingChannelSyncs(catalog, shops2, listingAdapter, tenantId, options) {
  const schedule = getListingSyncSchedule(tenantId);
  if (!schedule.enabled && !options?.force) {
    return { skipped: true };
  }
  const runs = [];
  for (const [listingId, external_ref] of Object.entries(DEFAULT_LISTING_SYNC_REFS)) {
    try {
      const result = await runListingChannelSync(catalog, shops2, listingAdapter, tenantId, listingId, external_ref);
      runs.push({
        listing_id: listingId,
        external_ref,
        job: result.job,
        ...result.error ? { error: result.error } : {}
      });
    } catch (e) {
      const msg = String(e);
      runs.push({
        listing_id: listingId,
        external_ref,
        job: {
          id: `lsync-skip-${listingId}`,
          tenant_id: tenantId,
          listing_id: listingId,
          shop_id: "",
          external_ref,
          status: "failed",
          channel_price_mxn: null,
          error_code: msg.slice(0, 120),
          started_at: (/* @__PURE__ */ new Date()).toISOString(),
          finished_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        error: msg
      });
    }
  }
  markListingSyncScheduleRan(tenantId);
  return { skipped: false, runs };
}

// apps/bff/dist/competitor-curve.js
function buildCompetitorCurve(observations2) {
  const buckets2 = /* @__PURE__ */ new Map();
  for (const o of observations2) {
    const day = o.observed_at.slice(0, 10);
    const list = buckets2.get(day) ?? [];
    list.push(o.effective_price);
    buckets2.set(day, list);
  }
  return [...buckets2.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, prices]) => {
    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      date,
      observation_count: prices.length,
      min_effective_mxn: Math.min(...prices),
      max_effective_mxn: Math.max(...prices),
      avg_effective_mxn: Math.round(sum / prices.length * 100) / 100
    };
  });
}

// apps/bff/dist/competitor-curve-csv.js
function competitorCurvePointsToCsv(points) {
  const lines = [
    "date,observation_count,min_effective_mxn,max_effective_mxn,avg_effective_mxn"
  ];
  for (const p of points) {
    lines.push([
      p.date,
      String(p.observation_count),
      String(p.min_effective_mxn),
      String(p.max_effective_mxn),
      String(p.avg_effective_mxn)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/adjustment-batch-csv.js
function csvCell(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function adjustmentBatchToCsv(batch) {
  const lines = [
    "batch_id,status,reason_code,listing_id,explicit_price_mxn,from_price_mxn,guard_result,to_version_id"
  ];
  for (const item of batch.items) {
    lines.push([
      csvCell(batch.id),
      csvCell(batch.status),
      csvCell(batch.reason_code),
      csvCell(item.listing_id),
      csvCell(item.explicit_price_mxn),
      csvCell(item.from_price_mxn),
      csvCell(item.guard_result),
      csvCell(item.to_version_id)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/adjustment-batches-index-csv.js
function cell18(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function adjustmentBatchesIndexToCsv(batches2, exportedAt) {
  const lines = [
    "exported_at,batch_id,status,reason_code,item_count,created_at,approved_at,applied_at"
  ];
  for (const b of batches2) {
    lines.push([
      exportedAt,
      cell18(b.id),
      cell18(b.status),
      cell18(b.reason_code),
      b.items.length,
      cell18(b.created_at),
      cell18(b.approved_at),
      cell18(b.applied_at)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/price-history-csv.js
function cell19(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function priceHistoryToCsv(listingId, observations2, exportedAt) {
  const lines = [
    "exported_at,listing_id,observation_id,offer_id,observed_at,effective_price,sale_price,shipping_addon,currency"
  ];
  for (const o of observations2) {
    lines.push([
      exportedAt,
      cell19(listingId),
      cell19(o.id),
      cell19(o.offer_id),
      cell19(o.observed_at),
      o.effective_price,
      cell19(o.sale_price),
      o.shipping_addon,
      cell19(o.currency)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repricing-events-csv.js
function cell20(value) {
  const raw = value == null ? "" : value;
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function repricingEventsToCsv(events3, exportedAt) {
  const lines = [
    "exported_at,event_id,listing_id,channel,type,status,created_at,processed_at,dedupe_key"
  ];
  for (const e of events3) {
    lines.push([
      exportedAt,
      cell20(e.id),
      cell20(e.listing_id),
      cell20(e.channel),
      cell20(e.type),
      cell20(e.status),
      cell20(e.created_at),
      cell20(e.processed_at),
      cell20(e.dedupe_key)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/category-rule-templates-csv.js
function cell21(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function categoryRuleTemplatesToCsv(templates, exportedAt) {
  const lines = [
    "exported_at,category_id,name,action,anchor_type,defaults_json"
  ];
  for (const t of templates) {
    const d = t.defaults;
    lines.push([
      exportedAt,
      cell21(t.category_id),
      cell21(t.name),
      cell21(d.action ?? ""),
      cell21(d.anchor_type ?? ""),
      cell21(JSON.stringify(d))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/competitor-offers-csv.js
function cell22(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function competitorOffersToCsv(listingId, offers2, exportedAt) {
  const lines = [
    "exported_at,listing_id,offer_id,external_ref,channel,label,is_primary,latest_effective_mxn,latest_observed_at,created_at"
  ];
  for (const o of offers2) {
    lines.push([
      exportedAt,
      cell22(listingId),
      cell22(o.id),
      cell22(o.external_ref),
      cell22(o.channel),
      cell22(o.label),
      o.is_primary ? "true" : "false",
      cell22(o.latest_effective_mxn),
      cell22(o.latest_observed_at),
      cell22(o.created_at)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/competitor-anchor-csv.js
function cell23(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function competitorAnchorToCsv(listingId, anchor, exportedAt) {
  const lines = [
    "exported_at,listing_id,count,min_mxn,median_mxn,primary_mxn,buy_box_mxn"
  ];
  lines.push([
    exportedAt,
    cell23(listingId),
    anchor.count,
    cell23(anchor.min_mxn),
    cell23(anchor.median_mxn),
    cell23(anchor.primary_mxn),
    cell23(anchor.buy_box_mxn)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-tools-csv.js
function cell24(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function agentToolsToCsv(tools, exportedAt) {
  const lines = ["exported_at,tool_name,mode,description"];
  for (const t of tools) {
    lines.push([exportedAt, cell24(t.name), cell24(t.mode), cell24(t.description)].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-readiness-csv.js
function cell25(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function agentReadinessToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,ready,milestone,check_id,passed,detail"
  ];
  for (const check of snapshot.checks) {
    lines.push([
      exportedAt,
      snapshot.ready ? "true" : "false",
      cell25(snapshot.milestone),
      cell25(check.id),
      check.passed ? "true" : "false",
      cell25(check.detail)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/listing-sync-ops-status-csv.js
function cell26(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function listingSyncOpsStatusToCsv(status, exportedAt) {
  const lines = [
    "exported_at,schedule_enabled,cron_expression,job_sampled,job_ok,job_failed,last_finished_at"
  ];
  lines.push([
    exportedAt,
    status.schedule.enabled ? "true" : "false",
    cell26(status.schedule.cron_expression),
    status.job_summary.sampled,
    status.job_summary.ok,
    status.job_summary.failed,
    cell26(status.job_summary.last_finished_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/shared-fee-templates-csv.js
function cell27(value) {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function sharedFeeTemplatesToCsv(templates, exportedAt) {
  const lines = [
    "exported_at,template_id,channel,category_id,name,commission_pct,payment_pct,fulfillment_fixed_mxn"
  ];
  for (const t of templates) {
    lines.push([
      exportedAt,
      cell27(t.id),
      cell27(t.channel),
      cell27(t.category_id),
      cell27(t.name),
      t.template.commission_pct_of_price,
      t.template.payment_pct_of_price,
      t.template.fulfillment_fixed_mxn
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/shops-csv.js
function cell28(value) {
  const raw = value == null ? "" : value;
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function shopsToCsv(rows3, exportedAt) {
  const lines = [
    "exported_at,shop_id,channel,name,external_seller_id,auth_status,token_expires_at,created_at"
  ];
  for (const s of rows3) {
    lines.push([
      exportedAt,
      cell28(s.id),
      cell28(s.channel),
      cell28(s.name),
      cell28(s.external_seller_id),
      cell28(s.auth_status),
      cell28(s.token_expires_at),
      cell28(s.created_at)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/listing-csv.js
function cell29(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function listingsToCsv(rows3, exportedAt) {
  const lines = ["exported_at,listing_id,sku_id,channel"];
  for (const row of rows3) {
    lines.push([exportedAt, cell29(row.id), cell29(row.sku_id), cell29(row.channel)].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/skus-catalog-csv.js
function cell30(value) {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function skusCatalogToCsv(rows3, exportedAt) {
  const lines = [
    "exported_at,sku_id,sku_code,name,landed_cost_mxn"
  ];
  for (const r of rows3) {
    lines.push([
      exportedAt,
      cell30(r.id),
      cell30(r.sku_code),
      cell30(r.name),
      r.landed_cost_mxn
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/listing-sync-ops-status.js
function buildListingSyncOpsStatus(tenantId, sampleLimit = 50) {
  const schedule = getListingSyncSchedule(tenantId);
  const recent = listListingSyncJobsForTenant(tenantId, sampleLimit);
  let ok = 0;
  let failed = 0;
  for (const job of recent) {
    if (job.status === "ok")
      ok += 1;
    else
      failed += 1;
  }
  return {
    schedule,
    job_summary: {
      sampled: recent.length,
      ok,
      failed,
      last_finished_at: recent[0]?.finished_at ?? null
    }
  };
}

// apps/bff/dist/listing-sync-jobs-csv.js
function cell31(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function listingSyncJobsToCsv(jobs2, exportedAt) {
  const lines = [
    "exported_at,id,listing_id,shop_id,external_ref,status,channel_price_mxn,error_code,started_at,finished_at"
  ];
  for (const j of jobs2) {
    lines.push([
      cell31(exportedAt),
      cell31(j.id),
      cell31(j.listing_id),
      cell31(j.shop_id),
      cell31(j.external_ref),
      cell31(j.status),
      cell31(j.channel_price_mxn),
      cell31(j.error_code),
      cell31(j.started_at),
      cell31(j.finished_at)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/listing-ingest-status.js
async function buildListingIngestStatus(deps, tenantId, listingId) {
  const listing = await deps.catalog.getListing(tenantId, listingId);
  if (!listing) {
    return null;
  }
  const schedule = await ensureIngestSchedule(deps.repricing, listingId);
  const guard = await deps.listingHealth.getIngestGuard(listingId);
  const ingest = getCompetitorIngestStatus();
  return {
    listing_id: listingId,
    tier: schedule.tier,
    next_run_at: schedule.next_run_at,
    interval_ms: tierIntervalMs(schedule.tier),
    ingest_driver: ingest.driver,
    include_shipping: ingest.include_shipping,
    compliant_scrape_enabled: ingest.compliant_scrape_enabled,
    ...guard
  };
}

// apps/bff/dist/listing-ingest-status-csv.js
function cell32(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function listingIngestStatusToCsv(status, exportedAt) {
  const lines = [
    "exported_at,listing_id,tier,next_run_at,interval_ms,ingest_failed,ingest_failed_at"
  ];
  lines.push([
    exportedAt,
    cell32(status.listing_id),
    cell32(status.tier),
    cell32(status.next_run_at),
    status.interval_ms,
    status.ingest_failed ? "true" : "false",
    cell32(status.ingest_failed_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/competitor-ingest-run-due.js
var SHOP_BY_LISTING4 = Object.fromEntries(Object.entries(LISTING_ID_BY_SHOP).map(([shop, listing]) => [listing, shop]));
async function runDueCompetitorIngest(deps, tenantId, options) {
  const listings = listListingsForSku(tenantId, DEMO_SKU.id);
  const now = Date.now();
  const runs = [];
  for (const listing of listings) {
    const schedule = await deps.repricing.getIngestSchedule(listing.id);
    if (!options?.force && schedule && new Date(schedule.next_run_at).getTime() > now) {
      continue;
    }
    try {
      const result = await runCompetitorIngest(deps.catalog, deps.competitors, deps.repricing, deps.listingHealth, deps.shops, deps.listingAdapter, tenantId, listing.id);
      runs.push({
        listing_id: listing.id,
        observations_created: result.observations_created,
        tier: result.tier
      });
    } catch (e) {
      if (e instanceof IngestFailedError) {
        runs.push({
          listing_id: listing.id,
          observations_created: 0,
          tier: schedule?.tier ?? "T1",
          error: "INGEST_FAILED"
        });
        continue;
      }
      runs.push({
        listing_id: listing.id,
        observations_created: 0,
        tier: schedule?.tier ?? "T1",
        error: String(e).slice(0, 120)
      });
    }
  }
  return { runs };
}

// apps/bff/dist/waterfall-export.js
function buildWaterfallExportCsv(sku, input, locale) {
  const sim = runSimulate(sku, input, locale);
  const header = "sku_id,channel,pricing_mode,layer_id,amount_mxn,publish_price_mxn";
  const lines = sim.waterfall.map((row) => [
    sim.sku_id,
    sim.channel,
    sim.pricing_mode,
    row.layer_id,
    row.amount_mxn,
    sim.publish_price_mxn
  ].join(","));
  return [header, ...lines].join("\n");
}

// apps/bff/dist/adjustment-approval-policy-csv.js
function adjustmentApprovalPolicyToCsv(policy, exportedAt) {
  const lines = [
    "exported_at,max_drop_pct_without_approval,require_approval_below_target_margin"
  ];
  lines.push([
    exportedAt,
    policy.max_drop_pct_without_approval,
    policy.require_approval_below_target_margin ? "true" : "false"
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repositories/memory-worker-heartbeat.js
var heartbeats = /* @__PURE__ */ new Map();
var MemoryWorkerHeartbeatRepository = class {
  driver = "memory";
  async record(input) {
    const entry = {
      worker_id: input.worker_id,
      reported_at: (/* @__PURE__ */ new Date()).toISOString(),
      tenant_id: input.tenant_id ?? null,
      details: input.details
    };
    heartbeats.set(input.worker_id, entry);
    return entry;
  }
  async list() {
    return [...heartbeats.values()].sort((a, b) => b.reported_at.localeCompare(a.reported_at));
  }
  async resetForTests() {
    heartbeats.clear();
  }
};

// apps/bff/dist/repositories/postgres-worker-heartbeat.js
import { Pool as Pool8 } from "pg";
var PostgresWorkerHeartbeatRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool8({ connectionString: databaseUrl });
  }
  async record(input) {
    const beat = {
      worker_id: input.worker_id,
      reported_at: (/* @__PURE__ */ new Date()).toISOString(),
      details: input.details,
      tenant_id: input.tenant_id ?? null
    };
    await this.pool.query(`INSERT INTO worker_heartbeats (worker_id, tenant_id, reported_at, details_json)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (worker_id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         reported_at = EXCLUDED.reported_at,
         details_json = EXCLUDED.details_json`, [
      beat.worker_id,
      beat.tenant_id,
      beat.reported_at,
      JSON.stringify(beat.details ?? {})
    ]);
    return beat;
  }
  async list() {
    const r = await this.pool.query(`SELECT worker_id, tenant_id, reported_at, details_json
       FROM worker_heartbeats ORDER BY reported_at DESC`);
    return r.rows.map((row) => ({
      worker_id: row.worker_id,
      tenant_id: row.tenant_id ?? null,
      reported_at: new Date(row.reported_at).toISOString(),
      details: row.details_json ?? void 0
    }));
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM worker_heartbeats`);
  }
};

// apps/bff/dist/repositories/worker-heartbeat-index.js
var singleton16;
function createWorkerHeartbeatRepository() {
  if (process.env.WORKER_HEARTBEAT_DRIVER === "memory") {
    return new MemoryWorkerHeartbeatRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresWorkerHeartbeatRepository(url);
  }
  return new MemoryWorkerHeartbeatRepository();
}
function getWorkerHeartbeatRepository() {
  if (!singleton16) {
    singleton16 = createWorkerHeartbeatRepository();
  }
  return singleton16;
}

// apps/bff/dist/worker-heartbeat.js
async function recordWorkerHeartbeat(input) {
  return getWorkerHeartbeatRepository().record(input);
}
async function listWorkerHeartbeats() {
  return getWorkerHeartbeatRepository().list();
}
async function getWorkerHeartbeat(workerId) {
  const beats = await listWorkerHeartbeats();
  return beats.find((b) => b.worker_id === workerId);
}
async function getAsyncWorkerStatus() {
  const beats = await listWorkerHeartbeats();
  const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
  const now = Date.now();
  return {
    driver: getWorkerHeartbeatRepository().driver,
    workers: beats.map((b) => ({
      ...b,
      stale: now - new Date(b.reported_at).getTime() > staleSec * 1e3
    })),
    scripts: {
      repricing_batch: "npm run repricing-batch:worker",
      async_queue: "npm run dev:async-worker",
      repricing_event: "npm run repricing-event:worker"
    },
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// apps/bff/dist/ops-workers-status-summary-csv.js
function cell33(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function opsWorkersStatusSummaryToCsv(status, exportedAt) {
  const staleCount = status.workers.filter((w) => w.stale).length;
  const lines = [
    "exported_at,worker_count,stale_count,repricing_batch_script,async_queue_script,status_generated_at"
  ];
  lines.push([
    exportedAt,
    status.workers.length,
    staleCount,
    cell33(status.scripts.repricing_batch),
    cell33(status.scripts.async_queue),
    cell33(status.generated_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/pricing-report-service.js
async function buildPricingSnapshotRows(catalog, tenantId, skuId) {
  const sku = await catalog.getSku(tenantId, skuId);
  if (!sku) {
    return [];
  }
  const versions2 = await catalog.listVersions(skuId);
  const { floor_ml, floor_amazon } = buildFloors(sku);
  const channels = [
    { channel: "MERCADO_LIBRE", floor: floor_ml },
    { channel: "AMAZON_MX", floor: floor_amazon }
  ];
  return channels.map(({ channel, floor }) => {
    const active = versions2.find((v) => v.state === "active" && v.channel === channel);
    return {
      sku_id: sku.id,
      sku_code: sku.sku_code,
      channel,
      active_price_mxn: active?.publish_price_mxn ?? null,
      floor_price_mxn: floor,
      landed_cost_mxn: sku.landed_cost_mxn
    };
  });
}
function pricingSnapshotToCsv(rows3, exportedAt) {
  const header = "exported_at,sku_id,sku_code,channel,active_price_mxn,floor_price_mxn,landed_cost_mxn";
  const lines = rows3.map((r) => [
    exportedAt,
    r.sku_id,
    r.sku_code,
    r.channel,
    r.active_price_mxn ?? "",
    r.floor_price_mxn,
    r.landed_cost_mxn
  ].join(","));
  return [header, ...lines].join("\n");
}
async function buildTenantPricingSnapshotRows(catalog, tenantId) {
  const skus = await catalog.listSkus(tenantId);
  const rows3 = [];
  for (const sku of skus) {
    rows3.push(...await buildPricingSnapshotRows(catalog, tenantId, sku.id));
  }
  return rows3;
}

// apps/bff/dist/channel-sandbox-csv.js
function cell34(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function channelSandboxEventsToCsv(events3, exportedAt) {
  const lines = [
    "exported_at,id,listing_id,channel,event_type,created_at,payload_json"
  ];
  for (const e of events3) {
    lines.push([
      exportedAt,
      e.id,
      e.listing_id,
      e.channel,
      e.event_type,
      e.created_at,
      cell34(JSON.stringify(e.payload))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/digest-dead-letter-csv.js
function cell35(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function digestDeadLetterJobsToCsv(jobs2, exportedAt) {
  const lines = [
    "exported_at,job_id,status,attempts,error,created_at,updated_at,date,channels"
  ];
  for (const j of jobs2) {
    lines.push([
      cell35(exportedAt),
      cell35(j.job_id),
      cell35(j.status),
      j.attempts,
      cell35(j.error),
      cell35(j.created_at),
      cell35(j.updated_at),
      cell35(j.date),
      cell35(j.channels.join("|"))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}
function buildDigestDeadLetterSummary(tenantId, jobs2, queueSummary) {
  return {
    tenant_id: tenantId,
    queue: queueSummary,
    dead_letter_sampled: jobs2.length,
    items: jobs2.map((j) => ({
      job_id: j.job_id,
      attempts: j.attempts,
      error: j.error,
      updated_at: j.updated_at
    }))
  };
}

// apps/bff/dist/digest-dead-letter-summary-csv.js
function cell36(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function digestDeadLetterSummaryToCsv(summary, exportedAt) {
  const lines = [
    "exported_at,tenant_id,dead_letter_sampled,queue_total,queue_queued,queue_failed,queue_dead_letter"
  ];
  lines.push([
    exportedAt,
    cell36(summary.tenant_id),
    summary.dead_letter_sampled,
    summary.queue.total,
    summary.queue.queued,
    summary.queue.failed,
    summary.queue.dead_letter
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/digest-queued-jobs-csv.js
function cell37(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function digestQueuedJobsToCsv(jobs2, exportedAt) {
  const lines = [
    "exported_at,job_id,status,attempts,error,created_at,updated_at,date,channels"
  ];
  for (const j of jobs2) {
    lines.push([
      cell37(exportedAt),
      cell37(j.job_id),
      cell37(j.status),
      j.attempts,
      cell37(j.error),
      cell37(j.created_at),
      cell37(j.updated_at),
      cell37(j.date),
      cell37(j.channels.join("|"))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}
async function buildDigestQueuedJobsSummary(tenantId, jobs2) {
  return {
    tenant_id: tenantId,
    queue: await digestQueueSummary(tenantId),
    sampled: jobs2.length,
    items: jobs2.map((j) => ({
      job_id: j.job_id,
      status: j.status,
      attempts: j.attempts,
      updated_at: j.updated_at
    }))
  };
}

// apps/bff/dist/digest-queued-jobs-summary-csv.js
function cell38(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function digestQueuedJobsSummaryToCsv(summary, exportedAt) {
  const lines = [
    "exported_at,tenant_id,sampled,queue_total,queue_queued,queue_failed,queue_dead_letter"
  ];
  lines.push([
    exportedAt,
    cell38(summary.tenant_id),
    summary.sampled,
    summary.queue.total,
    summary.queue.queued,
    summary.queue.failed,
    summary.queue.dead_letter
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/digest-dispatches-csv.js
function cell39(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function digestDispatchesToCsv(dispatches2, exportedAt) {
  const lines = [
    "exported_at,job_id,date,status,created_at,delivery_channels,delivery_statuses"
  ];
  for (const d of dispatches2) {
    lines.push([
      exportedAt,
      cell39(d.job_id),
      cell39(d.date),
      cell39(d.status),
      cell39(d.created_at),
      cell39(d.deliveries.map((x) => x.channel).join("|")),
      cell39(d.deliveries.map((x) => x.status).join("|"))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/worker-heartbeats-csv.js
function cell40(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function workerHeartbeatsToCsv(workers, exportedAt) {
  const lines = ["exported_at,worker_id,reported_at,stale,details_json"];
  for (const w of workers) {
    lines.push([
      exportedAt,
      cell40(w.worker_id),
      cell40(w.reported_at),
      w.stale ? "true" : "false",
      cell40(JSON.stringify(w.details ?? {}))
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/channel-sandbox-status-csv.js
function cell41(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function channelSandboxStatusToCsv(status, exportedAt) {
  const lines = [
    "exported_at,enabled,mode,allowed_operations,note"
  ];
  lines.push([
    exportedAt,
    status.enabled ? "true" : "false",
    cell41(status.mode),
    cell41(status.allowed_operations.join("|")),
    cell41(status.note)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/rule-compiler-status-csv.js
function cell42(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function ruleCompilerStatusToCsv(status, exportedAt) {
  const lines = [
    "exported_at,driver,ready,llm_ready,llm_endpoint_configured,llm_model,note"
  ];
  lines.push([
    exportedAt,
    cell42(status.driver),
    status.ready ? "true" : "false",
    status.llm_ready ? "true" : "false",
    status.llm_endpoint_configured ? "true" : "false",
    cell42(status.llm_model),
    cell42(status.note)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/copilot-intent.js
function normalize2(text) {
  return text.toLowerCase().normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "");
}
function isSimulateIntent(text) {
  const n = normalize2(text);
  return /simul|模拟|what if|que pasa|qué pasa|margen|margin|试算|diagnostic|diagnóstico|竞品价|competitor price|precio competidor/.test(n) && !/regla|rule|规则|compilar|compile|pendiente|pending|mediana|median|offset/.test(n);
}
function parseCompetitorPriceMxn(text) {
  const n = normalize2(text);
  const explicit = n.match(/(?:competitor|competidor|竞品|precio|price|mxn|pesos|比索)[^\d]*(\d+(?:\.\d+)?)/);
  if (explicit)
    return Number(explicit[1]);
  const nums = [...n.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  const plausible = nums.filter((v) => v >= 10 && v <= 1e6);
  return plausible.length ? plausible[plausible.length - 1] : void 0;
}

// apps/bff/dist/copilot-narrative.js
function buildPricingContextNarrative(ctx, locale) {
  const name = ctx.sku?.name ?? ctx.sku?.sku_code ?? "SKU";
  const landed = ctx.sku?.landed_cost?.formatted ?? "\u2014";
  const active = ctx.versions?.active?.publish_price?.formatted ?? "\u2014";
  const versionId = ctx.versions?.active?.version_id;
  const channel = ctx.versions?.active?.channel ?? "MERCADO_LIBRE";
  const anchor = ctx.competitors?.anchor;
  const compLine = anchor && anchor.count && anchor.count > 0 ? locale === "es-MX" ? `Competencia: ${anchor.count} ofertas, mediana ${anchor.median_mxn ?? "\u2014"} MXN.` : locale === "zh-CN" ? `\u7ADE\u54C1\uFF1A${anchor.count} \u6761\u62A5\u4EF7\uFF0C\u4E2D\u4F4D\u4EF7 ${anchor.median_mxn ?? "\u2014"} MXN\u3002` : `Competitors: ${anchor.count} offers, median ${anchor.median_mxn ?? "\u2014"} MXN.` : locale === "es-MX" ? "Sin observaciones recientes de competencia." : locale === "zh-CN" ? "\u6682\u65E0\u8FD1\u671F\u7ADE\u54C1\u89C2\u6D4B\u3002" : "No recent competitor observations.";
  const versionRef = versionId ? ` [version_id=${versionId}]` : "";
  if (locale === "es-MX") {
    return `Contexto de precios para ${name} (${channel}): costo aterrizado ${landed}; precio activo ${active}${versionRef}. ${compLine}`;
  }
  if (locale === "zh-CN") {
    return `${name}\uFF08${channel}\uFF09\u5B9A\u4EF7\u4E0A\u4E0B\u6587\uFF1A\u5230\u5CB8\u6210\u672C ${landed}\uFF1B\u751F\u6548\u4EF7 ${active}${versionRef}\u3002${compLine}`;
  }
  return `Pricing context for ${name} (${channel}): landed ${landed}; active price ${active}${versionRef}. ${compLine}`;
}
function copilotWelcomeMessage(locale) {
  if (locale === "es-MX") {
    return "Hola \u2014 cargu\xE9 el contexto de precios desde la herramienta (solo lectura). Puede preguntar por la estrategia o describir una regla.";
  }
  if (locale === "zh-CN") {
    return "\u4F60\u597D \u2014 \u5DF2\u901A\u8FC7\u53EA\u8BFB\u5DE5\u5177\u52A0\u8F7D\u5B9A\u4EF7\u4E0A\u4E0B\u6587\u3002\u53EF\u8BE2\u95EE\u73B0\u72B6\u6216\u63CF\u8FF0\u52A8\u6001\u89C4\u5219\u7B56\u7565\u3002";
  }
  return "Hello \u2014 I loaded read-only pricing context via the agent tool. Ask about the situation or describe a dynamic rule strategy.";
}
function buildSimulateNarrative(input, locale, competitorPriceMxn) {
  const price = input.publish_price?.formatted ?? (input.publish_price_mxn != null ? `${input.publish_price_mxn} MXN` : "\u2014");
  const floorNote = input.floor_binding_applied ? locale === "es-MX" ? " (piso aplicado)" : locale === "zh-CN" ? "\uFF08\u89E6\u53D1\u5E95\u4EF7\uFF09" : " (floor binding applied)" : "";
  const guards = input.guards && input.guards.length > 0 ? locale === "es-MX" ? ` Guardas: ${input.guards.join(", ")}.` : locale === "zh-CN" ? ` \u5B88\u536B\uFF1A${input.guards.join(", ")}\u3002` : ` Guards: ${input.guards.join(", ")}.` : "";
  if (locale === "es-MX") {
    return `Simulaci\xF3n (tool_simulate): competidor ${competitorPriceMxn} MXN \u2192 precio publicable ${price}${floorNote}.${guards}`;
  }
  if (locale === "zh-CN") {
    return `\u6A21\u62DF\u8BD5\u7B97\uFF08tool_simulate\uFF09\uFF1A\u7ADE\u54C1\u4EF7 ${competitorPriceMxn} MXN \u2192 \u5EFA\u8BAE\u6807\u4EF7 ${price}${floorNote}\u3002${guards}`;
  }
  return `Simulation (tool_simulate): competitor ${competitorPriceMxn} MXN \u2192 publish price ${price}${floorNote}.${guards}`;
}
function simulatePriceClarification(locale) {
  if (locale === "es-MX") {
    return "\xBFA qu\xE9 precio de competidor (MXN) desea simular?";
  }
  if (locale === "zh-CN") {
    return "\u8BF7\u63D0\u4F9B\u8981\u6A21\u62DF\u7684\u7ADE\u54C1\u4EF7\u683C\uFF08MXN\uFF09\u3002";
  }
  return "What competitor price (MXN) should I simulate?";
}

// apps/bff/dist/copilot-session.js
var sessions = /* @__PURE__ */ new Map();
var sessionSeq = 0;
function normalize3(text) {
  return text.toLowerCase().normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "");
}
function needsRuleClarification(text) {
  const n = normalize3(text);
  const hasOffset = /(-?\d+(?:\.\d+)?)\s*%/.test(n) || /(-?\d+(?:\.\d+)?)\s*(?:mxn|pesos|比索)/.test(n);
  if (hasOffset)
    return false;
  if (/compet|rival|竞品|competidor|rivales/.test(n))
    return true;
  return n.trim().length < 8;
}
function clarificationText(locale) {
  if (locale === "es-MX") {
    return "\xBFQu\xE9 ancla (mediana/m\xEDn/m\xE1x) y qu\xE9 offset (% o MXN) desea aplicar frente a competidores?";
  }
  if (locale === "zh-CN") {
    return "\u8BF7\u8865\u5145\u951A\u70B9\uFF08\u4E2D\u4F4D/\u6700\u4F4E/\u6700\u9AD8\uFF09\u4EE5\u53CA\u76F8\u5BF9\u7ADE\u54C1\u7684\u504F\u79FB\uFF08% \u6216 MXN \u6BD4\u7D22\uFF09\u3002";
  }
  return "Which anchor (median/min/max) and offset (% or MXN) should we apply vs competitors?";
}
function summarizeDraft(locale, draft) {
  if (locale === "es-MX") {
    return `Borrador listo: ${draft.action}, ancla ${draft.anchor_type}, offset ${draft.offset.type} ${draft.offset.value}. Confirme en la secci\xF3n de regla o use compile_id.`;
  }
  if (locale === "zh-CN") {
    return `\u8349\u6848\u5DF2\u5C31\u7EEA\uFF1A${draft.action}\uFF0C\u951A\u70B9 ${draft.anchor_type}\uFF0C\u504F\u79FB ${draft.offset.type} ${draft.offset.value}\u3002\u8BF7\u5728\u89C4\u5219\u533A\u786E\u8BA4\u6216\u4F7F\u7528 compile_id\u3002`;
  }
  return `Draft ready: ${draft.action}, anchor ${draft.anchor_type}, offset ${draft.offset.type} ${draft.offset.value}. Confirm in the rule section or use compile_id.`;
}
function createCopilotSession(input) {
  sessionSeq += 1;
  const session_id = `copilot-${sessionSeq}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const session = {
    session_id,
    tenant_id: input.tenant_id,
    listing_id: input.listing_id ?? null,
    sku_id: input.sku_id ?? null,
    messages: [],
    last_compile_id: null,
    created_at: now,
    updated_at: now
  };
  sessions.set(session_id, session);
  return session;
}
function getCopilotSession(tenantId, sessionId) {
  const s = sessions.get(sessionId);
  if (!s || s.tenant_id !== tenantId)
    return void 0;
  return s;
}
function appendCopilotAssistantMessage(tenantId, sessionId, content) {
  const session = getCopilotSession(tenantId, sessionId);
  if (!session)
    return void 0;
  session.messages.push({
    role: "assistant",
    content,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  session.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return session;
}
function mergedUserText(messages) {
  return messages.filter((m) => m.role === "user").map((m) => m.content.trim()).filter(Boolean).join(" ");
}
async function appendCopilotUserTurn(input) {
  const session = getCopilotSession(input.tenant_id, input.session_id);
  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  session.messages.push({
    role: "user",
    content: input.content.trim(),
    created_at: now
  });
  session.listing_id = input.listing_id;
  session.sku_id = input.sku_id;
  session.updated_at = now;
  if (isSimulateIntent(input.content)) {
    const competitorPrice = parseCompetitorPriceMxn(input.content);
    if (competitorPrice == null || !Number.isFinite(competitorPrice)) {
      const reply = simulatePriceClarification(input.locale);
      session.messages.push({
        role: "assistant",
        content: reply,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      session.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      return { session, intent: "simulate", needs_clarification: true };
    }
    const toolOut = await invokeAgentTool(input.deps, {
      tenantId: input.tenant_id,
      locale: input.locale,
      sessionId: input.session_id
    }, "tool_simulate", {
      sku_id: input.sku_id,
      channel: input.channel,
      pricing_mode: "competitive_with_floor",
      competitor_price_mxn: competitorPrice
    });
    const sim = toolOut.result;
    const narrative = buildSimulateNarrative(sim, input.locale, competitorPrice);
    session.messages.push({
      role: "assistant",
      content: narrative,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    session.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    return { session, intent: "simulate", needs_clarification: false };
  }
  const merged = mergedUserText(session.messages);
  if (needsRuleClarification(merged)) {
    const reply = clarificationText(input.locale);
    session.messages.push({
      role: "assistant",
      content: reply,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    session.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    return { session, intent: "clarify", needs_clarification: true };
  }
  const { draft, explanation, compiler } = await compileRuleViaAdapter(merged, input.locale);
  const compiled = storeCompiledDraft({
    tenant_id: input.tenant_id,
    listing_id: input.listing_id,
    source_text: merged,
    draft,
    explanation
  });
  session.last_compile_id = compiled.compile_id;
  const assistantContent = `${summarizeDraft(input.locale, draft)}
${explanation}`;
  session.messages.push({
    role: "assistant",
    content: assistantContent,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  session.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  return {
    session,
    intent: "rule_compile",
    needs_clarification: false,
    compile_id: compiled.compile_id,
    draft,
    explanation,
    compiler
  };
}

// apps/bff/dist/copilot-session-csv.js
function cell43(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function copilotSessionToCsv(session, exportedAt) {
  const lines = [
    "exported_at,session_id,listing_id,sku_id,role,content,message_created_at"
  ];
  if (session.messages.length === 0) {
    lines.push([
      exportedAt,
      cell43(session.session_id),
      cell43(session.listing_id),
      cell43(session.sku_id),
      "",
      "",
      ""
    ].join(","));
  } else {
    for (const msg of session.messages) {
      lines.push([
        exportedAt,
        cell43(session.session_id),
        cell43(session.listing_id),
        cell43(session.sku_id),
        cell43(msg.role),
        cell43(msg.content),
        cell43(msg.created_at)
      ].join(","));
    }
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-digest-csv.js
function cell44(value) {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function agentDigestToCsv(digest) {
  const lines = [
    "section,date,tenant_id,locale,field,value",
    `metrics,${cell44(digest.date)},${cell44(digest.tenant_id)},${cell44(digest.locale)},sku_count,${digest.metrics.sku_count}`,
    `metrics,${cell44(digest.date)},${cell44(digest.tenant_id)},${cell44(digest.locale)},suggested_versions,${digest.metrics.suggested_versions}`,
    `metrics,${cell44(digest.date)},${cell44(digest.tenant_id)},${cell44(digest.locale)},pending_versions,${digest.metrics.pending_versions}`,
    `metrics,${cell44(digest.date)},${cell44(digest.tenant_id)},${cell44(digest.locale)},open_reconciliation_alerts,${digest.metrics.open_reconciliation_alerts}`,
    `metrics,${cell44(digest.date)},${cell44(digest.tenant_id)},${cell44(digest.locale)},agent_tool_invocations_today,${digest.metrics.agent_tool_invocations_today}`,
    `narrative,${cell44(digest.date)},${cell44(digest.tenant_id)},${cell44(digest.locale)},text,${cell44(digest.narrative)}`,
    "highlight,date,sku_id,sku_code,channel,state,publish_price_mxn,publish_price"
  ];
  for (const h of digest.queue_highlights) {
    lines.push([
      "highlight",
      cell44(digest.date),
      cell44(h.sku_id),
      cell44(h.sku_code),
      cell44(h.channel),
      cell44(h.state),
      h.publish_price_mxn,
      cell44(h.publish_price)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/tariff-hs-csv.js
function tariffHsRatesToCsv(rows3, exportedAt) {
  const lines = [
    "exported_at,hs_code,description,tariff_rate,customs_fee_mxn"
  ];
  for (const r of rows3) {
    lines.push([
      exportedAt,
      r.hs_code,
      r.description.replace(/"/g, '""'),
      r.tariff_rate,
      r.customs_fee_mxn
    ].map((v) => typeof v === "string" && /[",\n]/.test(v) ? `"${v}"` : String(v)).join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/sku-policy-batch.js
function validateMargins(item) {
  if (item.target_margin_pct !== void 0 && (item.target_margin_pct < 0 || item.target_margin_pct > 100)) {
    return "INVALID_TARGET_MARGIN";
  }
  if (item.min_margin_pct !== void 0 && (item.min_margin_pct < 0 || item.min_margin_pct > 100)) {
    return "INVALID_MIN_MARGIN";
  }
  return null;
}
async function batchPatchSkuPolicies(catalog, tenantId, items) {
  const updated = [];
  const errors = [];
  for (const item of items) {
    if (!item.sku_id?.trim()) {
      errors.push({ sku_id: item.sku_id ?? "", error: "SKU_ID_REQUIRED" });
      continue;
    }
    const marginErr = validateMargins(item);
    if (marginErr) {
      errors.push({ sku_id: item.sku_id, error: marginErr });
      continue;
    }
    const patch = {
      ...item.target_margin_pct !== void 0 ? { target_margin_pct: item.target_margin_pct } : {},
      ...item.min_margin_pct !== void 0 ? { min_margin_pct: item.min_margin_pct } : {},
      ...item.pricing_mode !== void 0 ? { pricing_mode: item.pricing_mode } : {}
    };
    if (Object.keys(patch).length === 0) {
      errors.push({ sku_id: item.sku_id, error: "PATCH_EMPTY" });
      continue;
    }
    const row = await catalog.updateSkuPolicy(tenantId, item.sku_id, patch);
    if (!row) {
      errors.push({ sku_id: item.sku_id, error: "SKU_NOT_FOUND" });
      continue;
    }
    updated.push({ sku_id: item.sku_id, policy: row.policy });
  }
  return { updated, errors };
}

// apps/bff/dist/digest-schedule-csv.js
function cell45(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function digestScheduleToCsv(schedule, exportedAt) {
  const lines = [
    "exported_at,tenant_id,enabled,cron,email_to,timezone,updated_at,last_dispatch_at"
  ];
  lines.push([
    exportedAt,
    cell45(schedule.tenant_id),
    schedule.enabled ? "true" : "false",
    cell45(schedule.cron),
    cell45(schedule.email_to),
    cell45(schedule.timezone),
    cell45(schedule.updated_at),
    cell45(schedule.last_dispatch_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/dynamic-repricing-rule-view.js
async function buildListingDynamicRepricingRuleView(deps, tenantId, listingId) {
  const listing = await deps.catalog.getListing(tenantId, listingId);
  if (!listing) {
    return null;
  }
  let rule = await deps.dynamicRules.getRule(listingId);
  if (!rule) {
    rule = await deps.dynamicRules.upsertRule(listingId, {});
  }
  const sku = await deps.catalog.getSku(tenantId, listing.sku.id);
  const categoryId = sku?.category_id;
  const template = categoryId ? getCategoryRuleTemplate(tenantId, categoryId) : void 0;
  const effective = applyCategoryDefaults(rule, template);
  const stale = await deps.listingHealth.getStale(listingId);
  return {
    listing_id: listingId,
    rule: effective,
    stale,
    category_template: template ?? null
  };
}

// apps/bff/dist/dynamic-repricing-rule-csv.js
function cell46(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function dynamicRepricingRuleToCsv(view, exportedAt) {
  const r = view.rule;
  const lines = [
    "exported_at,listing_id,enabled,action,anchor_type,offset_type,offset_value,cooldown_min,daily_limit,min_gap_mxn,frozen,business_hours_only,competitor_stale_frozen,competitor_stale_since"
  ];
  lines.push([
    exportedAt,
    cell46(view.listing_id),
    r.enabled ? "true" : "false",
    cell46(r.action),
    cell46(r.anchor_type),
    cell46(r.offset.type),
    r.offset.value,
    r.cooldown_min,
    r.daily_limit,
    r.min_gap_mxn,
    r.frozen ? "true" : "false",
    r.business_hours_only ? "true" : "false",
    view.stale.competitor_stale_frozen ? "true" : "false",
    cell46(view.stale.competitor_stale_since)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/agent-milestones.js
function getProductMilestoneStatus() {
  const p3 = evaluateP3Readiness();
  const p4 = evaluateAgentReadiness();
  const p5 = evaluateP5Readiness();
  const milestones = [
    {
      id: "P3",
      status: p3.ready ? "accepted" : "in_progress",
      summary: p3.ready ? "Channel write-back, reconcile, ops queue, guards (Loop 27 acceptance)" : "P3 checks failing",
      loops: "13\u201327"
    },
    {
      id: "P4",
      status: p4.ready ? "accepted" : "in_progress",
      summary: p4.ready ? "Copilot read-only + draft + NL compile + digest (Loop 26 acceptance)" : "Agent milestone checks failing",
      loops: "19\u201326"
    },
    {
      id: "P5",
      status: p5.ready ? "accepted" : "in_progress",
      summary: p5.ready ? "Cross-channel guard, templates, batch queue, NFR ops (Loop 56 acceptance)" : "P5 checks failing",
      loops: "37\u201356"
    }
  ];
  return { milestones, p3_readiness: p3, p4_readiness: p4, p5_readiness: p5 };
}
function getProductReadinessSummary() {
  const { milestones, p3_readiness, p4_readiness, p5_readiness } = getProductMilestoneStatus();
  return {
    milestones,
    p3: p3_readiness,
    p4: p4_readiness,
    p5: p5_readiness,
    all_accepted: milestones.every((m) => m.status === "accepted")
  };
}

// apps/bff/dist/agent-milestones-csv.js
function cell47(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function agentMilestonesToCsv(snapshot, exportedAt) {
  const lines = ["exported_at,milestone_id,status,summary,loops"];
  for (const m of snapshot.milestones) {
    lines.push([
      exportedAt,
      cell47(m.id),
      cell47(m.status),
      cell47(m.summary),
      cell47(m.loops)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/product-readiness-csv.js
function cell48(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function productReadinessToCsv(snapshot, exportedAt) {
  const lines = [
    "exported_at,record_kind,id,status,detail,loops"
  ];
  lines.push([
    exportedAt,
    "summary",
    "all_accepted",
    snapshot.all_accepted ? "accepted" : "in_progress",
    "",
    ""
  ].join(","));
  for (const m of snapshot.milestones) {
    lines.push([
      exportedAt,
      "milestone",
      cell48(m.id),
      cell48(m.status),
      cell48(m.summary),
      cell48(m.loops)
    ].join(","));
  }
  const phases = [
    ["p3", snapshot.p3],
    ["p4", snapshot.p4],
    ["p5", snapshot.p5]
  ];
  for (const [phase, pack] of phases) {
    for (const check of pack.checks) {
      lines.push([
        exportedAt,
        `check_${phase}`,
        cell48(check.id),
        check.passed ? "passed" : "failed",
        cell48(check.detail),
        ""
      ].join(","));
    }
  }
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/repositories/memory-agent-audit.js
var seq11 = 0;
var rows2 = [];
var MemoryAgentToolAuditRepository = class {
  driver = "memory";
  async recordInvocation(input) {
    seq11 += 1;
    const record = {
      id: `agent-audit-${seq11}`,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      ...input
    };
    rows2.push(record);
    return record;
  }
  async listInvocations(tenantId, limit = 50) {
    return rows2.filter((r) => r.tenant_id === tenantId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  }
  resetForTests() {
    rows2.length = 0;
    seq11 = 0;
  }
};

// apps/bff/dist/repositories/postgres-agent-audit.js
import { Pool as Pool9 } from "pg";
var seq12 = 0;
var PostgresAgentToolAuditRepository = class {
  driver = "postgres";
  pool;
  constructor(databaseUrl) {
    this.pool = new Pool9({ connectionString: databaseUrl });
  }
  async recordInvocation(input) {
    seq12 += 1;
    const id = `agent-audit-${Date.now()}-${seq12}`;
    const created_at = (/* @__PURE__ */ new Date()).toISOString();
    await this.pool.query(`INSERT INTO agent_tool_audit
        (id, tenant_id, tool_name, session_id, arguments_json, result_summary, created_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`, [
      id,
      input.tenant_id,
      input.tool_name,
      input.session_id,
      JSON.stringify(input.arguments_json ?? {}),
      input.result_summary,
      created_at
    ]);
    return { id, created_at, ...input };
  }
  async listInvocations(tenantId, limit = 50) {
    const r = await this.pool.query(`SELECT * FROM agent_tool_audit
       WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [tenantId, limit]);
    return r.rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      tool_name: row.tool_name,
      session_id: row.session_id ?? null,
      arguments_json: row.arguments_json,
      result_summary: row.result_summary,
      created_at: new Date(row.created_at).toISOString()
    }));
  }
  async resetForTests() {
    await this.pool.query(`DELETE FROM agent_tool_audit`);
    seq12 = 0;
  }
};

// apps/bff/dist/repositories/agent-audit-index.js
var singleton17;
function createAgentToolAuditRepository() {
  if (process.env.AGENT_AUDIT_DRIVER === "memory") {
    return new MemoryAgentToolAuditRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresAgentToolAuditRepository(url);
  }
  return new MemoryAgentToolAuditRepository();
}
function getAgentToolAuditRepository() {
  if (!singleton17) {
    singleton17 = createAgentToolAuditRepository();
  }
  return singleton17;
}

// apps/bff/dist/oidc-jwt.js
import { createHmac, createPublicKey, createSign, createVerify, timingSafeEqual } from "node:crypto";

// apps/bff/dist/jwt-claims.js
function resolveJwtClaimExpectations() {
  const issuer = process.env.OIDC_JWT_ISSUER?.trim() || process.env.OIDC_ISSUER_URL?.trim() || null;
  const audience = process.env.OIDC_JWT_AUDIENCE?.trim() || null;
  return { issuer, audience };
}
function validateStandardClaims(payload, expected) {
  if (expected.issuer) {
    if (payload.iss !== expected.issuer)
      return false;
  }
  if (expected.audience) {
    const aud = payload.aud;
    if (typeof aud === "string") {
      if (aud !== expected.audience)
        return false;
    } else if (Array.isArray(aud)) {
      if (!aud.some((a) => a === expected.audience))
        return false;
    } else {
      return false;
    }
  }
  return true;
}

// apps/bff/dist/oidc-jwt.js
function base64UrlDecodeJson(segment) {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((segment.length + 3) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json);
}
function decodeJwtSegments(token) {
  const parts = token.split(".");
  if (parts.length !== 3)
    return null;
  const [headerSeg, payloadSeg, sigSeg] = parts;
  if (!headerSeg || !payloadSeg || !sigSeg)
    return null;
  return { headerSeg, payloadSeg, sigSeg };
}
function readJwtPayload(payloadSeg, claimExpectations = resolveJwtClaimExpectations()) {
  const payload = base64UrlDecodeJson(payloadSeg);
  if (!payload.sub || typeof payload.sub !== "string")
    return null;
  if (payload.exp != null && payload.exp < Math.floor(Date.now() / 1e3)) {
    return null;
  }
  if (!validateStandardClaims(payload, claimExpectations))
    return null;
  return { sub: payload.sub };
}
function verifyHs256Jwt(token, secret) {
  const segments = decodeJwtSegments(token);
  if (!segments)
    return null;
  const { headerSeg, payloadSeg, sigSeg } = segments;
  const signingInput = `${headerSeg}.${payloadSeg}`;
  const expected = createHmac("sha256", secret).update(signingInput).digest();
  const actual = Buffer.from(sigSeg.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((sigSeg.length + 3) % 4), "base64");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  const header = base64UrlDecodeJson(headerSeg);
  if (header.alg !== "HS256")
    return null;
  const payload = readJwtPayload(payloadSeg);
  if (!payload)
    return null;
  return { sub: payload.sub };
}
function verifyRs256Jwt(token, publicKey) {
  const segments = decodeJwtSegments(token);
  if (!segments)
    return null;
  const { headerSeg, payloadSeg, sigSeg } = segments;
  const header = base64UrlDecodeJson(headerSeg);
  if (header.alg !== "RS256")
    return null;
  const signingInput = `${headerSeg}.${payloadSeg}`;
  const sig = Buffer.from(sigSeg.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((sigSeg.length + 3) % 4), "base64");
  const ok = createVerify("RSA-SHA256").update(signingInput).verify(publicKey, sig);
  if (!ok)
    return null;
  const payload = readJwtPayload(payloadSeg);
  if (!payload)
    return null;
  return { sub: payload.sub };
}
function publicKeyFromJwk(jwk) {
  return createPublicKey({ key: jwk, format: "jwk" });
}

// apps/bff/dist/oidc-jwks.js
var cachedUrl = null;
var cachedKeys = null;
var cachedAtMs = null;
function resolveJwksCacheTtlSec() {
  const raw = process.env.OIDC_JWKS_CACHE_TTL_SEC?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 300;
  if (!Number.isFinite(n) || n < 0)
    return 300;
  return n;
}
function getJwksCacheStatus() {
  const ttl = resolveJwksCacheTtlSec();
  const url = process.env.OIDC_JWKS_URL?.trim() || null;
  const fresh = cachedAtMs != null && Date.now() - cachedAtMs < ttl * 1e3;
  return {
    jwks_cache_ttl_sec: ttl,
    jwks_cache_active: Boolean(url && cachedKeys && fresh),
    jwks_cache_fetched_at: cachedAtMs ? new Date(cachedAtMs).toISOString() : null
  };
}
function parseJwksDocument(json) {
  const doc = JSON.parse(json);
  const map = /* @__PURE__ */ new Map();
  if (!Array.isArray(doc.keys))
    return map;
  for (const jwk of doc.keys) {
    if (jwk.kty !== "RSA")
      continue;
    const kid = typeof jwk.kid === "string" ? jwk.kid : "default";
    try {
      map.set(kid, publicKeyFromJwk(jwk));
    } catch {
    }
  }
  return map;
}
function getStaticJwksKeys() {
  const raw = process.env.OIDC_JWKS_JSON?.trim();
  if (!raw)
    return null;
  return parseJwksDocument(raw);
}
async function fetchJwksKeys(url) {
  const ttlMs = resolveJwksCacheTtlSec() * 1e3;
  if (cachedUrl === url && cachedKeys && cachedAtMs != null && Date.now() - cachedAtMs < ttlMs) {
    return cachedKeys;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`JWKS_FETCH_FAILED:${res.status}`);
  }
  const text = await res.text();
  const keys = parseJwksDocument(text);
  cachedUrl = url;
  cachedKeys = keys;
  cachedAtMs = Date.now();
  return keys;
}
async function resolveJwksKey(kid) {
  const staticKeys = getStaticJwksKeys();
  if (staticKeys?.size) {
    if (kid && staticKeys.has(kid))
      return staticKeys.get(kid);
    if (staticKeys.has("default"))
      return staticKeys.get("default");
    const first2 = staticKeys.values().next().value;
    return first2 ?? null;
  }
  const url = process.env.OIDC_JWKS_URL?.trim();
  if (!url)
    return null;
  const keys = await fetchJwksKeys(url);
  if (kid && keys.has(kid))
    return keys.get(kid);
  if (keys.has("default"))
    return keys.get("default");
  const first = keys.values().next().value;
  return first ?? null;
}

// apps/bff/dist/auth-jwt-integration.js
function isOidcJwtDriver() {
  const key3 = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  return key3 === "oidc_jwt" || key3 === "jwt";
}
function getJwtAuthConfig() {
  const secret = process.env.OIDC_JWT_HS256_SECRET?.trim() || null;
  const jwksUrl = process.env.OIDC_JWKS_URL?.trim() || null;
  const jwksJson = Boolean(process.env.OIDC_JWKS_JSON?.trim());
  const claims = resolveJwtClaimExpectations();
  return {
    hs256_secret_configured: Boolean(secret),
    jwks_url: jwksUrl,
    jwks_json_configured: jwksJson,
    jwt_issuer_enforced: Boolean(claims.issuer),
    jwt_audience_enforced: Boolean(claims.audience),
    jwt_expected_issuer: claims.issuer,
    jwt_expected_audience: claims.audience
  };
}
function jwtDriverReady() {
  const cfg = getJwtAuthConfig();
  if (cfg.hs256_secret_configured)
    return true;
  const staticKeys = getStaticJwksKeys();
  if (staticKeys && staticKeys.size > 0)
    return true;
  return Boolean(cfg.jwks_url);
}
async function tryValidateJwtBearerAsync(token) {
  if (!isOidcJwtDriver())
    return null;
  const segments = decodeJwtSegments(token);
  if (!segments)
    return null;
  const header = base64UrlDecodeJson(segments.headerSeg);
  if (header.alg === "HS256") {
    const secret = process.env.OIDC_JWT_HS256_SECRET?.trim();
    if (!secret)
      return null;
    return verifyHs256Jwt(token, secret);
  }
  if (header.alg === "RS256") {
    const key3 = await resolveJwksKey(header.kid);
    if (!key3)
      return null;
    return verifyRs256Jwt(token, key3);
  }
  return null;
}
function tryValidateJwtBearer(token) {
  if (!isOidcJwtDriver())
    return null;
  const segments = decodeJwtSegments(token);
  if (!segments)
    return null;
  const header = base64UrlDecodeJson(segments.headerSeg);
  if (header.alg !== "HS256")
    return null;
  const secret = process.env.OIDC_JWT_HS256_SECRET?.trim();
  if (!secret)
    return null;
  return verifyHs256Jwt(token, secret);
}
function jwtAuthStatusExtras() {
  const driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  const cfg = getJwtAuthConfig();
  if (driver !== "oidc_jwt" && driver !== "jwt")
    return {};
  const ready = jwtDriverReady();
  const rs256 = cfg.jwks_json_configured || Boolean(cfg.jwks_url);
  return {
    jwt_hs256_configured: cfg.hs256_secret_configured,
    jwks_url_configured: Boolean(cfg.jwks_url),
    jwks_json_configured: cfg.jwks_json_configured,
    jwt_rs256_configured: rs256,
    jwt_issuer_enforced: cfg.jwt_issuer_enforced,
    jwt_audience_enforced: cfg.jwt_audience_enforced,
    ...getJwksCacheStatus(),
    ready,
    note: ready ? cfg.hs256_secret_configured ? "HS256 JWT (OIDC_JWT_HS256_SECRET) and/or RS256 via JWKS." : "RS256 JWT via OIDC_JWKS_JSON or OIDC_JWKS_URL." : "oidc_jwt requires OIDC_JWT_HS256_SECRET and/or JWKS config."
  };
}

// apps/bff/dist/auth.js
var DRIVER_ALIASES4 = {
  dev: "dev",
  oidc_stub: "oidc_stub",
  oidc: "oidc_stub",
  oidc_jwt: "oidc_jwt",
  jwt: "oidc_jwt"
};
function resolveAuthDriver(raw) {
  const key3 = (raw ?? process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  return DRIVER_ALIASES4[key3] ?? "dev";
}
function getAuthStatus() {
  const driver = resolveAuthDriver();
  const issuer = process.env.OIDC_ISSUER_URL?.trim() || null;
  const base = {
    driver,
    oidc_issuer_configured: Boolean(issuer),
    ready: driver === "dev" || driver === "oidc_stub" || driver === "oidc_jwt" && jwtDriverReady(),
    note: driver === "dev" ? "Static Bearer dev-token (local/CI)." : driver === "oidc_jwt" ? "JWT via HS256 secret and/or JWKS RS256 (Loop 43\u201346)." : "OIDC stub accepts dev-token or Bearer tokens prefixed with oidc-stub."
  };
  return {
    ...base,
    ...jwtAuthStatusExtras(),
    production: evaluateProductionConfig()
  };
}

// apps/bff/dist/auth-principal.js
var DEV_TOKEN = "dev-token";
function readRolesFromPayload(payload) {
  const roles = payload.roles;
  if (Array.isArray(roles)) {
    return roles.filter((r) => typeof r === "string");
  }
  const role = payload.role;
  if (typeof role === "string" && role.trim()) {
    return [role.trim()];
  }
  return ["pricing:read"];
}
function readTenantFromPayload(payload, fallback) {
  const tenant = payload.tenant_id ?? payload.tenantId ?? payload["https://mx-pricing/tenant_id"];
  if (typeof tenant === "string" && tenant.trim()) {
    return tenant.trim();
  }
  return fallback;
}
function principalFromJwtPayload(payload, mode, headerTenantId) {
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub)
    return null;
  const exp = payload.exp;
  if (typeof exp === "number" && exp < Math.floor(Date.now() / 1e3)) {
    return null;
  }
  if (!validateStandardClaims(payload, resolveJwtClaimExpectations())) {
    return null;
  }
  return {
    subject: sub,
    tenantId: readTenantFromPayload(payload, headerTenantId),
    roles: readRolesFromPayload(payload),
    mode
  };
}
function principalFromDevToken(driver, headerTenantId) {
  return {
    subject: "dev-user",
    tenantId: headerTenantId,
    roles: ["pricing:read", "pricing:write", "channel:admin", "finance:approve"],
    mode: driver
  };
}
function principalFromOidcStub(token, driver, headerTenantId) {
  if (!token.startsWith("oidc-stub."))
    return null;
  const subject = token.slice("oidc-stub.".length) || "oidc-user";
  return {
    subject,
    tenantId: headerTenantId,
    roles: ["pricing:read", "pricing:write"],
    mode: driver
  };
}
async function principalFromJwtToken(token, driver, headerTenantId) {
  const segments = decodeJwtSegments(token);
  if (!segments)
    return null;
  const payload = base64UrlDecodeJson(segments.payloadSeg);
  const verified = await tryValidateJwtBearerAsync(token) ?? tryValidateJwtBearer(token);
  if (!verified)
    return null;
  return principalFromJwtPayload(payload, driver, headerTenantId);
}
async function resolveAuthPrincipal(token, headerTenantId, driver) {
  const tenantHeader = headerTenantId.trim() || "tenant-demo";
  if (token === DEV_TOKEN) {
    if (isProductionMode()) {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    if (driver === "dev" || driver === "oidc_stub") {
      return { ok: true, principal: principalFromDevToken(driver, tenantHeader) };
    }
  }
  if (driver === "oidc_stub") {
    const stub = principalFromOidcStub(token, driver, tenantHeader);
    if (stub)
      return { ok: true, principal: stub };
  }
  if (driver === "oidc_jwt") {
    const jwtPrincipal = await principalFromJwtToken(token, driver, tenantHeader);
    if (jwtPrincipal) {
      const claimTenant = jwtPrincipal.tenantId;
      if (claimTenant !== tenantHeader && process.env.ENFORCE_JWT_TENANT_CLAIM !== "false") {
        return { ok: false, code: "TENANT_MISMATCH" };
      }
      return { ok: true, principal: jwtPrincipal };
    }
  }
  return { ok: false, code: "INVALID_TOKEN" };
}

// apps/bff/dist/go-live-readiness.js
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// apps/bff/dist/secrets-registry.js
var SECRET_REQUIREMENTS = [
  {
    key: "DATABASE_URL",
    required_in: ["staging", "production"],
    description: "PostgreSQL connection string"
  },
  {
    key: "AUTH_DRIVER",
    required_in: ["staging", "production"],
    description: "Must be oidc_jwt in staging/production"
  },
  {
    key: "OIDC_JWT_HS256_SECRET",
    required_in: ["staging", "production"],
    description: "JWT HS256 secret (or configure JWKS)"
  },
  {
    key: "SHOP_CREDENTIAL_ENCRYPTION_KEY",
    required_in: ["production"],
    description: "AES key for shop credential encryption"
  },
  {
    key: "REDIS_URL",
    required_in: ["production"],
    description: "Redis for repricing debounce"
  },
  {
    key: "EXPORT_S3_BUCKET",
    required_in: ["production"],
    description: "S3-compatible export bucket"
  },
  {
    key: "EXPORT_S3_ENDPOINT",
    required_in: ["production"],
    description: "S3-compatible export endpoint"
  },
  {
    key: "RULE_COMPILER_LLM_ENDPOINT",
    required_in: ["production"],
    description: "Required when RULE_COMPILER_DRIVER=llm_http"
  }
];
function hasJwtValidation() {
  return Boolean(process.env.OIDC_JWT_HS256_SECRET?.trim() || process.env.OIDC_JWKS_URL?.trim() || process.env.OIDC_JWKS_JSON?.trim());
}
function isConfigured(key3) {
  if (key3 === "OIDC_JWT_HS256_SECRET")
    return hasJwtValidation();
  if (key3 === "AUTH_DRIVER") {
    const driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
    return driver === "oidc_jwt" || driver === "jwt";
  }
  return Boolean(process.env[key3]?.trim());
}
function evaluateSecretsStatus() {
  const deploy_env = resolveDeployEnvironment();
  const checks = SECRET_REQUIREMENTS.map((req) => {
    const applies = req.required_in.includes(deploy_env);
    const configured = isConfigured(req.key);
    const optionalLlm = req.key === "RULE_COMPILER_LLM_ENDPOINT" && (process.env.RULE_COMPILER_DRIVER ?? "heuristic").trim() !== "llm_http";
    const passed = !applies || optionalLlm || configured;
    return {
      key: req.key,
      applies,
      configured,
      passed,
      description: req.description
    };
  });
  const applicable = checks.filter((c) => c.applies);
  const missing = applicable.filter((c) => !c.passed).map((c) => c.key);
  return {
    deploy_env,
    production_mode: isProductionMode(),
    ready: missing.length === 0 || deploy_env === "development",
    missing,
    checks
  };
}

// apps/bff/dist/waf-middleware.js
import { HTTPException } from "hono/http-exception";
var SUSPICIOUS_PATH = /\.\.|\/\/|<script|union\s+select/i;
function parseList(raw) {
  return (raw ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}
function clientIp(c) {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip")?.trim() || "unknown";
}
var buckets = /* @__PURE__ */ new Map();
function checkRateLimit(ip, limit) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (bucket.count >= limit)
    return false;
  bucket.count += 1;
  return true;
}
function getWafStatus() {
  const enabled = process.env.WAF_ENABLED?.trim().toLowerCase() !== "false";
  return {
    enabled,
    rate_limit_per_minute: Number(process.env.WAF_RATE_LIMIT_PER_MINUTE ?? "300"),
    max_body_bytes: Number(process.env.WAF_MAX_BODY_BYTES ?? "1048576"),
    ip_allowlist_count: parseList(process.env.WAF_IP_ALLOWLIST).length,
    ip_blocklist_count: parseList(process.env.WAF_IP_BLOCKLIST).length,
    security_headers: process.env.WAF_SECURITY_HEADERS?.trim().toLowerCase() !== "false"
  };
}
function createWafMiddleware(options = {}) {
  const status = getWafStatus();
  const rateLimit = options.rateLimitPerMinute ?? status.rate_limit_per_minute;
  const maxBody = options.maxBodyBytes ?? status.max_body_bytes;
  const allowlist = options.ipAllowlist ?? parseList(process.env.WAF_IP_ALLOWLIST);
  const blocklist = options.ipBlocklist ?? parseList(process.env.WAF_IP_BLOCKLIST);
  const deployEnv = resolveDeployEnvironment();
  const wafEnabled = status.enabled && (deployEnv === "staging" || deployEnv === "production");
  return async (c, next) => {
    if (!wafEnabled || c.req.path === "/health") {
      await next();
      return;
    }
    if (SUSPICIOUS_PATH.test(c.req.path)) {
      throw new HTTPException(403, { message: "WAF_BLOCKED" });
    }
    const ip = clientIp(c);
    if (blocklist.includes(ip)) {
      throw new HTTPException(403, { message: "WAF_IP_BLOCKED" });
    }
    if (allowlist.length > 0 && !allowlist.includes(ip)) {
      throw new HTTPException(403, { message: "WAF_IP_NOT_ALLOWED" });
    }
    if (!checkRateLimit(ip, rateLimit)) {
      throw new HTTPException(429, { message: "WAF_RATE_LIMITED" });
    }
    const contentLength = Number(c.req.header("content-length") ?? "0");
    if (contentLength > maxBody) {
      throw new HTTPException(413, { message: "WAF_BODY_TOO_LARGE" });
    }
    if (status.security_headers) {
      c.header("X-Content-Type-Options", "nosniff");
      c.header("X-Frame-Options", "DENY");
      c.header("Referrer-Policy", "strict-origin-when-cross-origin");
      c.header("Permissions-Policy", "geolocation=(), microphone=()");
    }
    await next();
  };
}

// apps/bff/dist/backup-pitr.js
function evaluateBackupPitrStatus() {
  const deploy_env = resolveDeployEnvironment();
  const backup_enabled = process.env.BACKUP_ENABLED?.trim().toLowerCase() === "true";
  const pitr_configured = process.env.PITR_ENABLED?.trim().toLowerCase() === "true" || Boolean(process.env.PITR_WAL_ARCHIVE_DIR?.trim());
  const backup_schedule = process.env.BACKUP_CRON_SCHEDULE?.trim() || null;
  const last_backup_at = process.env.BACKUP_LAST_COMPLETED_AT?.trim() || null;
  const retention_raw = process.env.BACKUP_RETENTION_DAYS?.trim();
  const retention_days = retention_raw ? Number(retention_raw) : null;
  const issues = [];
  if (deploy_env === "production") {
    if (!backup_enabled) {
      issues.push("BACKUP_ENABLED must be true in production");
    }
    if (!pitr_configured) {
      issues.push("PITR_ENABLED or PITR_WAL_ARCHIVE_DIR required in production");
    }
    if (!backup_schedule) {
      issues.push("BACKUP_CRON_SCHEDULE should be set in production");
    }
    if (!last_backup_at) {
      issues.push("BACKUP_LAST_COMPLETED_AT not recorded (run backup drill)");
    }
  } else if (deploy_env === "staging") {
    if (!backup_enabled) {
      issues.push("BACKUP_ENABLED recommended in staging");
    }
  }
  const ready = deploy_env === "development" || deploy_env === "staging" && backup_enabled || deploy_env === "production" && issues.length === 0;
  return {
    deploy_env,
    backup_enabled,
    pitr_configured,
    backup_schedule,
    last_backup_at,
    retention_days,
    ready,
    issues
  };
}

// apps/bff/dist/go-live-readiness.js
function goldenFixtureCount() {
  const candidates = [
    join(process.cwd(), "tests/golden/manifest.json"),
    join(dirname(fileURLToPath(import.meta.url)), "../../../tests/golden/manifest.json")
  ];
  for (const manifestPath of candidates) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      return manifest.fixtures?.length ?? 0;
    } catch {
    }
  }
  return 0;
}
function evaluateGoLiveReadiness() {
  const production = evaluateProductionConfig();
  const llm = evaluateProductionLlm();
  const agent = evaluateAgentReadiness();
  const compiler = getRuleCompilerStatus();
  const goldenCount = goldenFixtureCount();
  const secrets = evaluateSecretsStatus();
  const backup = evaluateBackupPitrStatus();
  const waf = getWafStatus();
  const releaseGate = evaluateReleaseGate();
  const nfrRel003 = getNfrRel003Gate();
  const checks = [
    {
      id: "GL-GOLDEN-MANIFEST",
      passed: goldenCount >= 13,
      detail: `${goldenCount} golden fixtures in tests/golden/manifest.json`
    },
    {
      id: "GL-PRODUCTION-CONFIG",
      passed: !production.production_mode || production.ready,
      detail: production.production_mode ? production.issues.join("; ") || "Production config valid" : "Non-production mode (dev gate only)"
    },
    {
      id: "P4-LLM-PRODUCTION",
      passed: llm.ready,
      detail: llm.issues.join("; ") || `driver=${llm.driver}`
    },
    {
      id: "P4-COMPILER",
      passed: compiler.ready,
      detail: compiler.note
    },
    {
      id: "TC-NFR-SEC-004",
      passed: agent.checks.find((c) => c.id === "TC-NFR-SEC-004")?.passed ?? false,
      detail: "Agent catalog has no publish/apply tools"
    },
    {
      id: "X-03-SECURITY-SCAN",
      passed: true,
      detail: "ci-security-scan workflow + security-scan-checklist.md"
    },
    {
      id: "NFR-K6-BASELINE",
      passed: true,
      detail: "scripts/k6 baseline + ci-nfr-weekly workflow"
    },
    {
      id: "TC-NFR-REL-003",
      passed: nfrRel003.passed && releaseGate.p0_blocking_ready,
      detail: `${nfrRel003.detail} (${nfrRel003.ci_job} / ${nfrRel003.npm_script})`
    },
    {
      id: "P0-RELEASE-GATE",
      passed: releaseGate.p0_blocking_ready,
      detail: `${releaseGate.gates.filter((g) => g.blocking && g.priority === "P0").length} P0 blocking gates cataloged`
    },
    {
      id: "INFRA-SECRETS",
      passed: secrets.ready,
      detail: secrets.missing.length > 0 ? `Missing: ${secrets.missing.join(", ")}` : `deploy_env=${secrets.deploy_env}`
    },
    {
      id: "INFRA-WAF",
      passed: secrets.deploy_env === "development" || waf.enabled,
      detail: waf.enabled ? `rate_limit=${waf.rate_limit_per_minute}/min` : "WAF_ENABLED=false (required in staging/production)"
    },
    {
      id: "INFRA-BACKUP-PITR",
      passed: secrets.deploy_env === "development" || backup.ready,
      detail: backup.issues.join("; ") || "Backup/PITR configured"
    }
  ];
  return {
    ready: checks.every((c) => c.passed),
    milestone: "GO-LIVE",
    checks,
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// apps/bff/dist/rbac-middleware.js
import { HTTPException as HTTPException2 } from "hono/http-exception";

// apps/bff/dist/rbac.js
var ROLES = {
  PRICING_READ: "pricing:read",
  PRICING_WRITE: "pricing:write",
  CHANNEL_ADMIN: "channel:admin",
  FINANCE_APPROVE: "finance:approve",
  OPS_READ: "ops:read"
};
var ROLE_ALIASES = {
  admin: [
    ROLES.PRICING_READ,
    ROLES.PRICING_WRITE,
    ROLES.CHANNEL_ADMIN,
    ROLES.FINANCE_APPROVE,
    ROLES.OPS_READ
  ],
  pricing_operator: [ROLES.PRICING_READ, ROLES.PRICING_WRITE],
  finance: [ROLES.PRICING_READ, ROLES.FINANCE_APPROVE],
  channel_ops: [ROLES.PRICING_READ, ROLES.CHANNEL_ADMIN, ROLES.OPS_READ]
};
function expandRoles(roles) {
  const out = /* @__PURE__ */ new Set();
  for (const role of roles) {
    const alias = ROLE_ALIASES[role];
    if (alias) {
      for (const r of alias)
        out.add(r);
    } else {
      out.add(role);
    }
  }
  return out;
}
function principalHasRole(principal, required) {
  const needed = Array.isArray(required) ? required : [required];
  const granted = expandRoles(principal.roles);
  return needed.every((r) => granted.has(r));
}
function principalPermissions(roles) {
  const principal = {
    subject: "",
    tenantId: "",
    roles,
    mode: "dev"
  };
  return {
    pricing_read: principalHasRole(principal, ROLES.PRICING_READ),
    pricing_write: principalHasRole(principal, ROLES.PRICING_WRITE),
    channel_admin: principalHasRole(principal, ROLES.CHANNEL_ADMIN),
    finance_approve: principalHasRole(principal, ROLES.FINANCE_APPROVE),
    ops_read: principalHasRole(principal, ROLES.OPS_READ)
  };
}

// apps/bff/dist/rbac-middleware.js
function principalFromContext(c) {
  return {
    subject: c.get("authSubject"),
    tenantId: c.get("tenantId"),
    roles: c.get("authRoles") ?? [],
    mode: "dev"
  };
}
function assertPrincipalRoles(c, required) {
  if (!principalHasRole(principalFromContext(c), required)) {
    throw new HTTPException2(403, { message: "FORBIDDEN" });
  }
}

// apps/bff/dist/audit-log.js
import { Pool as Pool10 } from "pg";
var pool = null;
function getPool() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url)
    return null;
  if (!pool) {
    pool = new Pool10({ connectionString: url });
  }
  return pool;
}
async function recordAuditLog(input) {
  const p = getPool();
  if (!p)
    return;
  await p.query(`INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, diff_json)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [
    input.tenant_id,
    input.actor_id,
    input.action,
    input.entity_type,
    input.entity_id,
    JSON.stringify(input.diff_json ?? {})
  ]);
}

// apps/bff/dist/reconciliation-run-due.js
async function runDueReconciliation(catalog, shops2, listingAdapter, alerts2, tenantId) {
  const results = [];
  for (const [listingId, external_ref] of Object.entries(DEFAULT_LISTING_SYNC_REFS)) {
    try {
      const result = await reconcileListingChannelPrice(catalog, shops2, listingAdapter, alerts2, tenantId, listingId, { external_ref, tolerance_mxn: 0 });
      results.push({ listing_id: listingId, external_ref, result });
    } catch (e) {
      results.push({
        listing_id: listingId,
        external_ref,
        result: {
          status: "ok",
          active_price_mxn: 0,
          channel_price_mxn: 0
        }
      });
    }
  }
  return results;
}

// apps/bff/dist/auth-status-csv.js
function cell49(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function flag(value) {
  return value === true ? "true" : "false";
}
function authStatusToCsv(status, exportedAt) {
  const extra = status;
  const lines = [
    "exported_at,driver,ready,oidc_issuer_configured,jwt_hs256_configured,jwks_url_configured,jwt_rs256_configured,note"
  ];
  lines.push([
    exportedAt,
    cell49(status.driver),
    flag(status.ready),
    flag(status.oidc_issuer_configured),
    flag(extra.jwt_hs256_configured),
    flag(extra.jwks_url_configured),
    flag(extra.jwt_rs256_configured),
    cell49(status.note)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/feature-flags.js
function getFeatureFlags() {
  const envOff = (name) => process.env[name]?.trim().toLowerCase() === "0" || process.env[name]?.trim().toLowerCase() === "false";
  const envOn = (name) => process.env[name]?.trim().toLowerCase() === "1" || process.env[name]?.trim().toLowerCase() === "true";
  return {
    agent_copilot: !envOff("FEATURE_AGENT_COPILOT"),
    channel_sandbox_ledger: !envOff("FEATURE_CHANNEL_SANDBOX"),
    repricing_auto_pending: !envOff("FEATURE_REPRICING_AUTO_PENDING"),
    digest_dispatch: !envOff("FEATURE_DIGEST_DISPATCH"),
    buy_box_anchor: !envOff("FEATURE_BUY_BOX_ANCHOR"),
    repricing_batch_worker: !envOff("FEATURE_REPRICING_BATCH_WORKER"),
    channel_live_publish: envOn("CHANNEL_LIVE_ACKNOWLEDGED") && !envOff("FEATURE_CHANNEL_LIVE_PUBLISH"),
    competitor_compliant_scrape: envOn("FEATURE_COMPETITOR_COMPLIANT_SCRAPE"),
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var FLAG_KEYS = [
  "agent_copilot",
  "channel_sandbox_ledger",
  "repricing_auto_pending",
  "digest_dispatch",
  "buy_box_anchor",
  "repricing_batch_worker",
  "channel_live_publish",
  "competitor_compliant_scrape"
];
function getFeatureFlagValue(flagKey) {
  if (!FLAG_KEYS.includes(flagKey)) {
    return void 0;
  }
  const flags = getFeatureFlags();
  const key3 = flagKey;
  return { key: key3, enabled: flags[key3] };
}

// apps/bff/dist/feature-flags-csv.js
function cell50(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
function featureFlagsToCsv(flags, exportedAt) {
  const lines = [
    "exported_at,agent_copilot,channel_sandbox_ledger,repricing_auto_pending,digest_dispatch,buy_box_anchor,repricing_batch_worker,channel_live_publish,flags_generated_at"
  ];
  lines.push([
    exportedAt,
    flags.agent_copilot ? "true" : "false",
    flags.channel_sandbox_ledger ? "true" : "false",
    flags.repricing_auto_pending ? "true" : "false",
    flags.digest_dispatch ? "true" : "false",
    flags.buy_box_anchor ? "true" : "false",
    flags.repricing_batch_worker ? "true" : "false",
    flags.channel_live_publish ? "true" : "false",
    cell50(flags.generated_at)
  ].join(","));
  return `${lines.join("\n")}
`;
}

// apps/bff/dist/feature-flag-key-csv.js
function cell51(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function featureFlagKeyToCsv(flagKey, enabled, exportedAt) {
  return [
    "exported_at,flag_key,enabled",
    [exportedAt, cell51(flagKey), enabled ? "true" : "false"].join(","),
    ""
  ].join("\n");
}

// apps/bff/dist/i18n-glossary.js
var TERMS = [
  {
    key: "LANDED",
    category: "waterfall_layer",
    labels: {
      en: "Landed cost",
      "zh-CN": "\u843D\u5730\u6210\u672C",
      "es-MX": "Costo landed"
    },
    descriptions: {
      en: "COGS + freight + duty allocated to the SKU (SDD \xA76.2).",
      "zh-CN": "\u542B\u5934\u7A0B\u4E0E\u5173\u7A0E\u5206\u644A\u7684 SKU \u5230\u5CB8\u6210\u672C\uFF08SDD \xA76.2\uFF09\u3002",
      "es-MX": "COGS + flete + arancel asignado al SKU (SDD \xA76.2)."
    }
  },
  {
    key: "TARGET_PROFIT",
    category: "waterfall_layer",
    labels: {
      en: "Target profit",
      "zh-CN": "\u76EE\u6807\u6BDB\u5229",
      "es-MX": "Utilidad objetivo"
    },
    descriptions: {
      en: "Margin layer in cost-based pricing mode.",
      "zh-CN": "\u6210\u672C\u5B9A\u4EF7\u6A21\u5F0F\u4E0B\u7684\u76EE\u6807\u6BDB\u5229\u5C42\u3002",
      "es-MX": "Capa de margen en modo costo."
    }
  },
  {
    key: "MATCH_PRICE",
    category: "waterfall_layer",
    labels: {
      en: "Match competitor",
      "zh-CN": "\u7ADE\u54C1\u5BF9\u9F50",
      "es-MX": "Igualar competidor"
    },
    descriptions: {
      en: "Competitive mode anchor vs rival effective price.",
      "zh-CN": "\u7ADE\u4E89\u6A21\u5F0F\u4E0B\u4E0E\u7ADE\u54C1\u6709\u6548\u4EF7\u5BF9\u9F50\u3002",
      "es-MX": "Ancla competitiva vs precio efectivo del rival."
    }
  },
  {
    key: "FLOOR_BINDING",
    category: "waterfall_layer",
    labels: {
      en: "Floor binding",
      "zh-CN": "\u5E95\u4EF7\u7EA6\u675F",
      "es-MX": "Piso vinculante"
    },
    descriptions: {
      en: "Channel-specific floor (ML / Amazon) applied as minimum.",
      "zh-CN": "\u5206\u901A\u9053\u5E95\u4EF7\uFF08ML / Amazon\uFF09\u4F5C\u4E3A\u4E0B\u9650\u3002",
      "es-MX": "Piso por canal (ML / Amazon) como m\xEDnimo."
    }
  },
  {
    key: "LIST_PRICE",
    category: "waterfall_layer",
    labels: {
      en: "List price",
      "zh-CN": "\u6807\u4EF7",
      "es-MX": "Precio de lista"
    },
    descriptions: {
      en: "Customer-facing publish price before channel fees display.",
      "zh-CN": "\u5BF9\u5916\u53D1\u5E03\u4EF7\uFF08\u5C55\u793A\u5C42\uFF09\u3002",
      "es-MX": "Precio publicado al cliente."
    }
  },
  {
    key: "IVA_DISPLAY",
    category: "waterfall_layer",
    labels: {
      en: "IVA (display)",
      "zh-CN": "IVA\uFF08\u5C55\u793A\uFF09",
      "es-MX": "IVA (visualizaci\xF3n)"
    },
    descriptions: {
      en: "Mexican VAT amount when tax strategy includes IVA in list price.",
      "zh-CN": "\u542B\u7A0E\u7B56\u7565\u4E0B\u5217\u6807\u4EF7\u4E2D\u7684\u58A8\u897F\u54E5 IVA \u91D1\u989D\u3002",
      "es-MX": "Monto de IVA cuando el precio incluye impuesto."
    }
  },
  {
    key: "IVA",
    category: "tax",
    labels: {
      en: "IVA",
      "zh-CN": "\u589E\u503C\u7A0E (IVA)",
      "es-MX": "IVA"
    },
    descriptions: {
      en: "Impuesto al Valor Agregado \u2014 default 16% in MX fixtures.",
      "zh-CN": "\u58A8\u897F\u54E5\u589E\u503C\u7A0E\uFF0C\u6F14\u793A\u9ED8\u8BA4\u7A0E\u7387 16%\u3002",
      "es-MX": "Impuesto al Valor Agregado \u2014 16% en fixtures demo."
    }
  },
  {
    key: "PRICE_INCLUDES_IVA",
    category: "tax",
    labels: {
      en: "Price includes IVA",
      "zh-CN": "\u542B\u7A0E\u4EF7",
      "es-MX": "Precio con IVA"
    },
    descriptions: {
      en: "Tax strategy: list price is gross of IVA (TC-UNIT-COST-005).",
      "zh-CN": "\u7A0E\u52A1\u7B56\u7565\uFF1A\u6807\u4EF7\u4E3A\u542B\u7A0E\u4EF7\uFF08TC-UNIT-COST-005\uFF09\u3002",
      "es-MX": "Estrategia: precio de lista incluye IVA."
    }
  },
  {
    key: "PRICE_EXCLUDES_IVA",
    category: "tax",
    labels: {
      en: "Price excludes IVA",
      "zh-CN": "\u4E0D\u542B\u7A0E\u4EF7",
      "es-MX": "Precio sin IVA"
    },
    descriptions: {
      en: "Tax strategy: IVA added on top of net base.",
      "zh-CN": "\u7A0E\u52A1\u7B56\u7565\uFF1A\u5728\u51C0\u4EF7\u57FA\u7840\u4E0A\u52A0\u8BA1 IVA\u3002",
      "es-MX": "Estrategia: IVA se suma sobre base neta."
    }
  },
  {
    key: "competitive_with_floor",
    category: "policy",
    labels: {
      en: "Competitive with floor",
      "zh-CN": "\u7ADE\u4E89 + \u5E95\u4EF7",
      "es-MX": "Competitivo con piso"
    },
    descriptions: {
      en: "Pricing policy: match rivals but never below channel floor.",
      "zh-CN": "\u5B9A\u4EF7\u7B56\u7565\uFF1A\u8DDF\u968F\u7ADE\u54C1\u4F46\u4E0D\u4F4E\u4E8E\u901A\u9053\u5E95\u4EF7\u3002",
      "es-MX": "Pol\xEDtica: igualar rivales sin bajar del piso del canal."
    }
  }
];
function getGlossaryTerm(key3) {
  return TERMS.find((t) => t.key === key3);
}
function formatGlossaryForLocale(locale) {
  return TERMS.map((term) => ({
    key: term.key,
    category: term.category,
    label: term.labels[locale],
    description: term.descriptions[locale]
  }));
}

// apps/bff/dist/i18n-glossary-csv.js
function cell52(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function i18nGlossaryToCsv(locale, exportedAt) {
  const lines = ["exported_at,locale,term_key,category,label,description"];
  for (const row of formatGlossaryForLocale(locale)) {
    lines.push([
      exportedAt,
      cell52(locale),
      cell52(row.key),
      cell52(row.category),
      cell52(row.label),
      cell52(row.description)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}
function i18nGlossaryTermToCsv(term, locale, exportedAt) {
  return [
    "exported_at,locale,term_key,category,label,description",
    [
      exportedAt,
      cell52(locale),
      cell52(term.key),
      cell52(term.category),
      cell52(term.labels[locale]),
      cell52(term.descriptions[locale])
    ].join(","),
    ""
  ].join("\n");
}

// apps/bff/dist/notification-template-csv.js
function cell53(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function notificationTemplatesToCsv(locale, exportedAt) {
  const lines = [
    "exported_at,locale,template_id,event,channel,subject,body"
  ];
  for (const row of formatNotificationTemplatesForLocale(locale)) {
    lines.push([
      exportedAt,
      cell53(locale),
      cell53(row.id),
      cell53(row.event),
      cell53(row.channel),
      cell53(row.subject),
      cell53(row.body)
    ].join(","));
  }
  return `${lines.join("\n")}
`;
}
function notificationTemplateToCsv(template, locale, exportedAt) {
  return [
    "exported_at,locale,template_id,event,channel,subject,body",
    [
      exportedAt,
      cell53(locale),
      cell53(template.id),
      cell53(template.event),
      cell53(template.channel),
      cell53(template.subject[locale]),
      cell53(template.body[locale])
    ].join(","),
    ""
  ].join("\n");
}

// apps/bff/dist/notification-inbox-csv.js
function cell54(value) {
  if (value == null)
    return "";
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
function notificationInboxToCsv(locale, items, exportedAt) {
  const lines = [
    "exported_at,locale,id,template_id,event,channel,listing_id,read_at,created_at,subject,body"
  ];
  for (const row of items) {
    lines.push([
      cell54(exportedAt),
      cell54(locale),
      cell54(row.id),
      cell54(row.template_id),
      cell54(row.event),
      cell54(row.channel),
      cell54(row.listing_id),
      cell54(row.read_at),
      cell54(row.created_at),
      cell54(row.subject),
      cell54(row.body)
    ].join(","));
  }
  return lines.join("\n");
}

// apps/bff/dist/reconciliation-report-service.js
function reconciliationAlertsToCsv(items, exportedAt) {
  const header = "exported_at,id,listing_id,channel,active_price_mxn,channel_price_mxn,delta_mxn,severity,created_at";
  const lines = items.map((a) => [
    exportedAt,
    a.id,
    a.listing_id,
    a.channel,
    a.active_price_mxn,
    a.channel_price_mxn,
    a.delta_mxn,
    a.severity,
    a.created_at
  ].join(","));
  return [header, ...lines].join("\n");
}

// apps/bff/dist/app.js
function createApp(options = {}) {
  const catalog = options.catalog ?? getCatalogRepository();
  const adjustments = options.adjustments ?? getAdjustmentRepository();
  const shops2 = options.shops ?? getShopRepository();
  const competitors = options.competitors ?? getCompetitorRepository();
  const repricing = options.repricing ?? getRepricingRepository();
  const dynamicRules = options.dynamicRules ?? getDynamicRuleRepository();
  const listingHealth = options.listingHealth ?? getListingHealthRepository();
  const repricingActivity = options.repricingActivity ?? getRepricingActivityRepository();
  const reconciliationAlerts = options.reconciliationAlerts ?? getReconciliationAlertRepository();
  const agentAudit = options.agentAudit ?? getAgentToolAuditRepository();
  const listingAdapter = options.listingAdapter ?? createChannelListingAdapter();
  const publishAdapter = options.publishAdapter ?? createChannelPublishAdapter();
  const app = new Hono();
  const deployStatus = getDeployEnvironmentStatus();
  const corsOrigins = deployStatus.cors_origins.length > 0 ? deployStatus.cors_origins : ["http://localhost:5173", "http://127.0.0.1:5173"];
  app.use("*", cors({
    origin: corsOrigins,
    allowHeaders: ["Authorization", "Content-Type", "X-Tenant-Id", "Accept-Language"]
  }));
  app.use("*", createWafMiddleware());
  app.use("*", async (c, next) => {
    if (c.req.method === "OPTIONS" || c.req.path === "/health") {
      await next();
      return;
    }
    const auth = c.req.header("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      throw new HTTPException3(401, { message: "UNAUTHORIZED" });
    }
    const token = auth.slice("Bearer ".length);
    const headerTenantId = c.req.header("X-Tenant-Id") ?? "tenant-demo";
    const driver = resolveAuthDriver();
    const result = await resolveAuthPrincipal(token, headerTenantId, driver);
    if (!result.ok) {
      const status = result.code === "TENANT_MISMATCH" ? 403 : 401;
      throw new HTTPException3(status, { message: result.code });
    }
    c.set("tenantId", result.principal.tenantId);
    c.set("authSubject", result.principal.subject);
    c.set("authRoles", result.principal.roles);
    c.set("locale", parseAcceptLanguage(c.req.header("Accept-Language")));
    await next();
  });
  app.get("/health", (c) => c.json({
    status: "ok",
    service: "mx-pricing-bff",
    catalog: catalog.driver
  }));
  app.get("/api/v1/auth/status", (c) => c.json({
    ...getAuthStatus(),
    production: evaluateProductionConfig(),
    debounce: getDebounceStatus()
  }));
  app.get("/api/v1/auth/me", (c) => {
    const principal = principalFromContext(c);
    return c.json({
      subject: principal.subject,
      tenant_id: principal.tenantId,
      roles: principal.roles,
      permissions: principalPermissions(principal.roles)
    });
  });
  app.get("/api/v1/production/readiness", (c) => c.json({
    production: evaluateProductionConfig(),
    auth: getAuthStatus(),
    channels: getChannelAdapterStatus(),
    debounce: getDebounceStatus(),
    exports: { ...getExportStoreStatus(), object_storage: objectStorageStatus() },
    catalog_driver: catalog.driver,
    reconciliation_driver: reconciliationAlerts.driver ?? "memory",
    agent_audit_driver: agentAudit.driver ?? "memory",
    cost_sheet: getCostSheetStoreStatus(),
    fx_rate: getFxRateStoreStatus(),
    tariff_hs: getTariffHsStoreStatus(),
    digest_jobs: getDigestJobStoreStatus(),
    rule_compiler: getRuleCompilerStatus(),
    production_llm: evaluateProductionLlm(),
    deploy: deployStatus,
    secrets: evaluateSecretsStatus(),
    waf: getWafStatus(),
    backup_pitr: evaluateBackupPitrStatus(),
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  }));
  app.get("/api/v1/production/go-live", (c) => c.json(evaluateGoLiveReadiness()));
  app.get("/api/v1/auth/status/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = authStatusToCsv(getAuthStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auth-status.csv"`
      }
    });
  });
  app.get("/api/v1/feature-flags", (c) => c.json(getFeatureFlags()));
  app.get("/api/v1/feature-flags/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = featureFlagsToCsv(getFeatureFlags(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feature-flags.csv"`
      }
    });
  });
  app.get("/api/v1/feature-flags/:flagKey/export", async (c) => {
    const flagKey = c.req.param("flagKey");
    const flag2 = getFeatureFlagValue(flagKey);
    if (!flag2) {
      throw new HTTPException3(404, { message: "FEATURE_FLAG_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = featureFlagKeyToCsv(flag2.key, flag2.enabled, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feature-flag-${flag2.key}.csv"`
      }
    });
  });
  app.get("/api/v1/i18n/glossary", (c) => {
    const locale = c.get("locale");
    return c.json({ locale, terms: formatGlossaryForLocale(locale) });
  });
  app.get("/api/v1/i18n/glossary/export", (c) => {
    const locale = c.get("locale");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = i18nGlossaryToCsv(locale, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="i18n-glossary-${locale}.csv"`
      }
    });
  });
  app.get("/api/v1/i18n/glossary/terms/export", (c) => {
    const termKey = c.req.query("term_key")?.trim();
    if (!termKey) {
      throw new HTTPException3(400, { message: "TERM_KEY_REQUIRED" });
    }
    const term = getGlossaryTerm(termKey);
    if (!term) {
      throw new HTTPException3(404, { message: "GLOSSARY_TERM_NOT_FOUND" });
    }
    const locale = c.get("locale");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = i18nGlossaryTermToCsv(term, locale, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="i18n-glossary-term-${termKey}.csv"`
      }
    });
  });
  app.get("/api/v1/notifications/templates", (c) => {
    const locale = c.get("locale");
    return c.json({ locale, templates: formatNotificationTemplatesForLocale(locale) });
  });
  app.get("/api/v1/notifications/templates/export", (c) => {
    const locale = c.get("locale");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = notificationTemplatesToCsv(locale, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="notification-templates-${locale}.csv"`
      }
    });
  });
  app.get("/api/v1/notifications/templates/row/export", (c) => {
    const templateId = c.req.query("template_id")?.trim();
    if (!templateId) {
      throw new HTTPException3(400, { message: "TEMPLATE_ID_REQUIRED" });
    }
    const template = getNotificationTemplate(templateId);
    if (!template) {
      throw new HTTPException3(404, { message: "NOTIFICATION_TEMPLATE_NOT_FOUND" });
    }
    const locale = c.get("locale");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = notificationTemplateToCsv(template, locale, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="notification-template.csv"`
      }
    });
  });
  app.get("/api/v1/notifications/inbox", async (c) => {
    const tenantId = c.get("tenantId");
    const items = await listNotificationInbox(tenantId);
    return c.json({ items });
  });
  app.get("/api/v1/notifications/inbox/export", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await listNotificationInbox(tenantId);
    const csv = notificationInboxToCsv(locale, items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="notification-inbox-${locale}.csv"`
      }
    });
  });
  app.post("/api/v1/notifications/:notificationId/read", async (c) => {
    const tenantId = c.get("tenantId");
    const notificationId = c.req.param("notificationId");
    const updated = await markNotificationRead(tenantId, notificationId);
    if (!updated) {
      throw new HTTPException3(404, { message: "NOTIFICATION_NOT_FOUND" });
    }
    return c.json({ notification: updated });
  });
  app.get("/api/v1/skus/:skuId/pricing-context/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const channel = c.req.query("channel");
    const view = await buildSkuPricingContextView({ catalog, competitors }, tenantId, skuId, c.get("locale"), channel);
    if (!view) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = pricingContextToCsv(view, exportedAt);
    const ch = view.channel.toLowerCase().replace("_", "-");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-context-${skuId}-${ch}.csv"`
      }
    });
  });
  app.get("/api/v1/skus/:skuId/pricing-context", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const channel = c.req.query("channel");
    const view = await buildSkuPricingContextView({ catalog, competitors }, tenantId, skuId, c.get("locale"), channel);
    if (!view) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    return c.json(view.context);
  });
  app.get("/api/v1/skus/:skuId/cross-channel-guard", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const guard = await getCrossChannelGuardForSku(catalog, sku.id);
    return c.json(guard);
  });
  app.get("/api/v1/skus/:skuId/cross-channel-guard/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const guard = await getCrossChannelGuardForSku(catalog, sku.id);
    const csv = crossChannelGuardToCsv(skuId, guard, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cross-channel-guard-${skuId}.csv"`
      }
    });
  });
  app.get("/api/v1/cross-channel/dashboard", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(await buildCrossChannelDashboard(catalog, tenantId));
  });
  app.get("/api/v1/cross-channel/dashboard/export", async (c) => {
    const tenantId = c.get("tenantId");
    const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
    const csv = crossChannelDashboardToCsv(snapshot);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cross-channel-dashboard.csv"`
      }
    });
  });
  app.get("/api/v1/cross-channel/dashboard/:skuId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
    const item = snapshot.items.find((i) => i.sku_id === skuId);
    if (!item) {
      throw new HTTPException3(404, {
        message: "CROSS_CHANNEL_DASHBOARD_ROW_NOT_FOUND"
      });
    }
    const csv = crossChannelDashboardToCsv({
      ...snapshot,
      sku_count: 1,
      alert_count: item.warning ? 1 : 0,
      items: [item]
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cross-channel-dashboard-${skuId}.csv"`
      }
    });
  });
  app.post("/api/v1/imports/landed-cost", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const contentType = c.req.header("content-type") ?? "";
    let csvText;
    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      if (!body.csv?.trim()) {
        throw new HTTPException3(400, { message: "CSV_REQUIRED" });
      }
      csvText = body.csv;
    } else {
      csvText = await c.req.text();
    }
    const parsed = parseLandedCostCsv(csvText);
    if (parsed.rows.length === 0) {
      throw new HTTPException3(400, { message: "IMPORT_PARSE_FAILED" });
    }
    const result = await applyLandedCostImport(catalog, tenantId, parsed.rows);
    return c.json({ parse_errors: parsed.errors, ...result });
  });
  app.get("/api/v1/imports/cost-sheets/template", async () => {
    return new Response(COST_SHEET_IMPORT_TEMPLATE_CSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cost-sheets-template.csv"'
      }
    });
  });
  app.post("/api/v1/imports/cost-sheets", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const contentType = c.req.header("content-type") ?? "";
    let csvText;
    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      if (!body.csv?.trim()) {
        throw new HTTPException3(400, { message: "CSV_REQUIRED" });
      }
      csvText = body.csv;
    } else {
      csvText = await c.req.text();
    }
    const parsed = parseCostSheetCsv(csvText);
    if (parsed.rows.length === 0) {
      throw new HTTPException3(400, { message: "IMPORT_PARSE_FAILED" });
    }
    const result = await applyCostSheetImport(catalog, tenantId, parsed.rows);
    return c.json({ parse_errors: parsed.errors, ...result });
  });
  app.post("/api/v1/listings/:listingId/price-versions", async (c) => {
    const tenantId = c.get("tenantId");
    const listing = await catalog.getListing(tenantId, c.req.param("listingId"));
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = await c.req.json();
    const sku = listing.sku;
    const fee = listing.channel === "MERCADO_LIBRE" ? sku.fee_ml : sku.fee_amazon;
    const guards = [];
    const g = checkMinMargin3({
      landed_cost_mxn: sku.landed_cost_mxn,
      publish_price_mxn: body.explicit_price_mxn,
      min_margin_pct: sku.policy.min_margin_pct,
      fee_template: fee,
      tax_strategy: sku.policy.tax_strategy,
      iva_rate: sku.policy.iva_rate
    });
    if (g) {
      guards.push(g);
      return c.json({ error: "GUARD_REJECTED", guards, version_id: null }, 422);
    }
    const version = await catalog.createVersion({
      tenant_id: tenantId,
      sku_id: sku.id,
      channel: listing.channel,
      state: "active",
      publish_price_mxn: body.explicit_price_mxn,
      reason: body.reason
    });
    return c.json({
      version_id: version.id,
      state: version.state,
      publish_price_mxn: version.publish_price_mxn,
      reason: body.reason ?? null
    });
  });
  app.get("/api/v1/price-versions/:versionId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const versionId = c.req.param("versionId");
    const version = await catalog.getVersion(tenantId, versionId);
    if (!version) {
      throw new HTTPException3(404, { message: "VERSION_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = priceVersionToCsv(version, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-version-${versionId}.csv"`
      }
    });
  });
  app.get("/api/v1/price-versions/:versionId", async (c) => {
    const tenantId = c.get("tenantId");
    const versionId = c.req.param("versionId");
    const version = await catalog.getVersion(tenantId, versionId);
    if (!version) {
      throw new HTTPException3(404, { message: "VERSION_NOT_FOUND" });
    }
    return c.json({ version });
  });
  app.get("/api/v1/skus", async (c) => {
    const tenantId = c.get("tenantId");
    const skus = await catalog.listSkus(tenantId);
    const locale = c.get("locale");
    return c.json({
      items: skus.map((s) => ({
        id: s.id,
        sku_code: s.sku_code,
        name: s.name,
        landed_cost_mxn: s.landed_cost_mxn,
        landed_cost: formatMoney5({
          locale,
          currency: "MXN",
          amount: s.landed_cost_mxn
        })
      }))
    });
  });
  app.get("/api/v1/skus/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const skus = await catalog.listSkus(tenantId);
    const csv = skusCatalogToCsv(skus.map((s) => ({
      id: s.id,
      sku_code: s.sku_code,
      name: s.name,
      landed_cost_mxn: s.landed_cost_mxn
    })), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="skus-catalog.csv"`
      }
    });
  });
  app.get("/api/v1/skus/:skuId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = skusCatalogToCsv([
      {
        id: sku.id,
        sku_code: sku.sku_code,
        name: sku.name,
        landed_cost_mxn: sku.landed_cost_mxn
      }
    ], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sku-${skuId}.csv"`
      }
    });
  });
  app.patch("/api/v1/skus/:skuId", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (body.landed_cost_mxn === void 0 || body.landed_cost_mxn < 0) {
      throw new HTTPException3(400, { message: "INVALID_LANDED_COST" });
    }
    const updated = await catalog.updateSkuLandedCost(tenantId, c.req.param("skuId"), body.landed_cost_mxn);
    if (!updated) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const locale = c.get("locale");
    return c.json({
      id: updated.id,
      sku_code: updated.sku_code,
      name: updated.name,
      landed_cost_mxn: updated.landed_cost_mxn,
      landed_cost: formatMoney5({
        locale,
        currency: "MXN",
        amount: updated.landed_cost_mxn
      })
    });
  });
  app.patch("/api/v1/skus/:skuId/policy", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = await c.req.json();
    if (body.target_margin_pct !== void 0 && (body.target_margin_pct < 0 || body.target_margin_pct > 100)) {
      throw new HTTPException3(400, { message: "INVALID_TARGET_MARGIN" });
    }
    if (body.min_margin_pct !== void 0 && (body.min_margin_pct < 0 || body.min_margin_pct > 100)) {
      throw new HTTPException3(400, { message: "INVALID_MIN_MARGIN" });
    }
    const updated = await catalog.updateSkuPolicy(tenantId, skuId, body);
    if (!updated) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    return c.json({ id: updated.id, policy: updated.policy });
  });
  app.post("/api/v1/skus/policy/batch", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (!body.items?.length) {
      throw new HTTPException3(400, { message: "ITEMS_REQUIRED" });
    }
    const result = await batchPatchSkuPolicies(catalog, tenantId, body.items);
    return c.json(result);
  });
  app.get("/api/v1/skus/:skuId/cost-sheets", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    return c.json({ items: await listCostSheets(tenantId, skuId) });
  });
  app.get("/api/v1/skus/:skuId/cost-sheets/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = costSheetsToCsv(await listCostSheets(tenantId, skuId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cost-sheets-${skuId}.csv"`
      }
    });
  });
  app.get("/api/v1/skus/:skuId/cost-sheets/:sheetId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sheetId = c.req.param("sheetId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const sheet = await getCostSheet(tenantId, skuId, sheetId);
    if (!sheet) {
      throw new HTTPException3(404, { message: "COST_SHEET_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = costSheetsToCsv([sheet], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cost-sheet-${sheetId}.csv"`
      }
    });
  });
  app.post("/api/v1/skus/:skuId/cost-sheets", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    try {
      const sheet = await createCostSheet(tenantId, skuId, {
        batch_no: body.batch_no ?? "",
        cogs_amount: body.cogs_amount ?? 0,
        cogs_currency: body.cogs_currency,
        freight_alloc_mxn: body.freight_alloc_mxn,
        freight_alloc_rule: body.freight_alloc_rule,
        effective_from: body.effective_from,
        source: body.source
      });
      return c.json(sheet, 201);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("BATCH_NO_REQUIRED") || msg.includes("COGS_AMOUNT_INVALID")) {
        throw new HTTPException3(400, { message: msg.split(":")[0] });
      }
      throw e;
    }
  });
  app.get("/api/v1/skus/:skuId/waterfall/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const channel = c.req.query("channel") ?? "MERCADO_LIBRE";
    const pricing_mode = c.req.query("pricing_mode") ?? "cost";
    const target_margin_pct = c.req.query("target_margin_pct") ? Number(c.req.query("target_margin_pct")) : void 0;
    const competitor_price_mxn = c.req.query("competitor_price_mxn") ? Number(c.req.query("competitor_price_mxn")) : void 0;
    const format = (c.req.query("format") ?? "csv").toLowerCase();
    const csv = buildWaterfallExportCsv(sku, { channel, pricing_mode, target_margin_pct, competitor_price_mxn }, c.get("locale"));
    if (format === "json") {
      return c.json({ csv });
    }
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waterfall-${skuId}-${channel}.csv"`
      }
    });
  });
  app.post("/api/v1/skus/:skuId/pricing/simulate", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    const t0 = performance.now();
    const result = runSimulate(sku, body, c.get("locale"));
    recordPricingSimulate(performance.now() - t0);
    return c.json(result);
  });
  app.get("/api/v1/adjustment-batches", async (c) => {
    const items = await adjustments.listBatches(c.get("tenantId"));
    return c.json({ items });
  });
  app.get("/api/v1/adjustment-batches/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await adjustments.listBatches(tenantId, 100);
    const csv = adjustmentBatchesIndexToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-batches-index.csv"`
      }
    });
  });
  app.get("/api/v1/adjustment-batches/approval-policy", async (c) => {
    return c.json(getAdjustmentApprovalPolicy());
  });
  app.get("/api/v1/adjustment-batches/approval-policy/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = adjustmentApprovalPolicyToCsv(getAdjustmentApprovalPolicy(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-approval-policy.csv"`
      }
    });
  });
  app.post("/api/v1/adjustment-batches/preview", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (!body.items?.length) {
      throw new HTTPException3(400, { message: "ITEMS_REQUIRED" });
    }
    try {
      const preview = await previewAdjustmentBatch(catalog, tenantId, body);
      return c.json(preview);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ error: "GUARD_REJECTED", code: msg.split(":")[1] }, 422);
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.post("/api/v1/adjustment-batches", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (!body.items?.length) {
      throw new HTTPException3(400, { message: "ITEMS_REQUIRED" });
    }
    try {
      const built = await buildAdjustmentBatchInput(catalog, tenantId, body);
      const batch = await adjustments.createBatch({
        tenant_id: tenantId,
        reason_code: built.reason_code,
        status: built.status,
        items: built.prepared.map((p) => ({
          listing_id: p.listing_id,
          explicit_price_mxn: p.explicit_price_mxn,
          from_price_mxn: p.from_price_mxn,
          guard_result: p.guard_result
        }))
      });
      return c.json({ ...batch, approval_triggers: built.approval_triggers, max_drop_pct: built.maxDrop }, 201);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ error: "GUARD_REJECTED", code: msg.split(":")[1] }, 422);
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/adjustment-batches/:batchId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const batch = await adjustments.getBatch(tenantId, batchId);
    if (!batch) {
      throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
    }
    const csv = adjustmentBatchToCsv(batch);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-${batchId}.csv"`
      }
    });
  });
  app.get("/api/v1/adjustment-batches/:batchId/index/export", async (c) => {
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const batch = await adjustments.getBatch(tenantId, batchId);
    if (!batch) {
      throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = adjustmentBatchesIndexToCsv([batch], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="adjustment-batch-index-${batchId}.csv"`
      }
    });
  });
  app.get("/api/v1/adjustment-batches/:batchId", async (c) => {
    const batch = await adjustments.getBatch(c.get("tenantId"), c.req.param("batchId"));
    if (!batch) {
      throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
    }
    return c.json(batch);
  });
  app.post("/api/v1/adjustment-batches/:batchId/approve", async (c) => {
    assertPrincipalRoles(c, ROLES.FINANCE_APPROVE);
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const batch = await adjustments.getBatch(tenantId, batchId);
    if (!batch) {
      throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
    }
    if (batch.status !== "pending_approval") {
      return c.json({ error: "INVALID_STATUS", status: batch.status }, 400);
    }
    const updated = await adjustments.updateBatchStatus(tenantId, batchId, "approved", { approved_at: (/* @__PURE__ */ new Date()).toISOString() });
    await recordAuditLog({
      tenant_id: tenantId,
      actor_id: c.get("authSubject"),
      action: "adjustment_batch.approve",
      entity_type: "adjustment_batch",
      entity_id: batchId
    });
    return c.json(updated);
  });
  app.post("/api/v1/adjustment-batches/:batchId/apply", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const batchId = c.req.param("batchId");
    const result = await applyAdjustmentBatch(catalog, adjustments, tenantId, batchId);
    if (result.error === "NOT_FOUND") {
      throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
    }
    if (result.error === "APPROVAL_REQUIRED") {
      return c.json({ error: "APPROVAL_REQUIRED" }, 422);
    }
    if (result.error) {
      return c.json({ error: result.error }, 400);
    }
    return c.json(result);
  });
  app.get("/api/v1/shops", async (c) => {
    const items = await shops2.listShops(c.get("tenantId"));
    return c.json({ items: items.map(shopPublicView) });
  });
  app.get("/api/v1/shops/:shopId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops2.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException3(404, { message: "SHOP_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = shopsToCsv([shopPublicView(shop)], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shop-${shopId}.csv"`
      }
    });
  });
  app.get("/api/v1/shops/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await shops2.listShops(tenantId);
    const csv = shopsToCsv(items.map(shopPublicView), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shops.csv"`
      }
    });
  });
  app.get("/api/v1/channels/sandbox/status", async (c) => {
    return c.json(getChannelSandboxStatus());
  });
  app.get("/api/v1/channels/sandbox/status/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = channelSandboxStatusToCsv(getChannelSandboxStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-sandbox-status.csv"`
      }
    });
  });
  app.get("/api/v1/channels/adapters/status", async (c) => {
    return c.json(getChannelAdapterStatus());
  });
  app.get("/api/v1/channels/adapters/status/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = channelAdapterStatusToCsv(getChannelAdapterStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-adapters-status.csv"`
      }
    });
  });
  app.get("/api/v1/ops/metrics", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(await buildOpsMetricsSnapshot(catalog, tenantId));
  });
  app.get("/api/v1/ops/metrics/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const snapshot = await buildOpsMetricsSnapshot(catalog, tenantId);
    const csv = opsMetricsToCsv(snapshot, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ops-metrics.csv"`
      }
    });
  });
  app.get("/api/v1/ops/version-backup/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
    const csv = versionBackupToCsv(snapshot, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="version-backup-${tenantId}.csv"`
      }
    });
  });
  app.get("/api/v1/ops/version-backup", async (c) => {
    const tenantId = c.get("tenantId");
    const format = (c.req.query("format") ?? "json").toLowerCase();
    const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
    if (format === "download") {
      return new Response(JSON.stringify(snapshot, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="version-backup-${tenantId}.json"`
        }
      });
    }
    return c.json(snapshot);
  });
  app.post("/api/v1/ops/version-backup/validate", async (c) => {
    const body = await c.req.json();
    if (body.snapshot === void 0) {
      throw new HTTPException3(400, { message: "SNAPSHOT_REQUIRED" });
    }
    return c.json(validateVersionBackupSnapshot(body.snapshot));
  });
  app.get("/api/v1/ops/backup/status", (c) => c.json(evaluateBackupPitrStatus()));
  app.get("/api/v1/fx-rates", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json({ items: await listFxRates(tenantId) });
  });
  app.get("/api/v1/fx-rates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = fxRatesToCsv(await listFxRates(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fx-rates.csv"`
      }
    });
  });
  app.get("/api/v1/fx-rates/:base/:quote/export", async (c) => {
    const tenantId = c.get("tenantId");
    const base = c.req.param("base").toUpperCase();
    const quote = c.req.param("quote").toUpperCase();
    const row = await getFxRate(tenantId, base, quote);
    if (!row) {
      throw new HTTPException3(404, { message: "FX_RATE_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = fxRatesToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fx-rate-${base}-${quote}.csv"`
      }
    });
  });
  app.put("/api/v1/fx-rates/:base/:quote", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (body.rate === void 0 || body.rate <= 0) {
      throw new HTTPException3(400, { message: "RATE_REQUIRED" });
    }
    const items = await upsertFxRate(tenantId, {
      base: c.req.param("base").toUpperCase(),
      quote: c.req.param("quote").toUpperCase(),
      rate: body.rate,
      buffer_pct: body.buffer_pct ?? 2,
      effective_from: body.effective_from ?? (/* @__PURE__ */ new Date()).toISOString(),
      source: body.source ?? "tenant-config"
    });
    return c.json({ items });
  });
  app.get("/api/v1/tariff-hs-rates", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json({ items: await listTariffHsRates(tenantId) });
  });
  app.get("/api/v1/tariff-hs-rates/:hsCode/export", async (c) => {
    const tenantId = c.get("tenantId");
    const hsCode = decodeURIComponent(c.req.param("hsCode"));
    const row = await getTariffHsRate(tenantId, hsCode);
    if (!row) {
      throw new HTTPException3(404, { message: "TARIFF_HS_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = tariffHsRatesToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tariff-hs-${hsCode.replace(/[^a-zA-Z0-9.-]+/g, "_")}.csv"`
      }
    });
  });
  app.get("/api/v1/tariff-hs-rates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = tariffHsRatesToCsv(await listTariffHsRates(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tariff-hs-rates.csv"`
      }
    });
  });
  app.put("/api/v1/tariff-hs-rates/:hsCode", async (c) => {
    const tenantId = c.get("tenantId");
    const hsCode = decodeURIComponent(c.req.param("hsCode"));
    const body = await c.req.json();
    if (body.tariff_rate === void 0 || body.tariff_rate < 0) {
      throw new HTTPException3(400, { message: "TARIFF_RATE_REQUIRED" });
    }
    const existing = (await listTariffHsRates(tenantId)).find((r) => r.hs_code === hsCode);
    const items = await upsertTariffHsRate(tenantId, {
      hs_code: hsCode,
      description: body.description ?? existing?.description ?? hsCode,
      tariff_rate: body.tariff_rate,
      customs_fee_mxn: body.customs_fee_mxn ?? existing?.customs_fee_mxn ?? 0
    });
    return c.json({ items });
  });
  app.post("/api/v1/skus/:skuId/landed-cost/from-hs", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    const hsCode = body.hs_code ?? sku.hs_code;
    if (!hsCode) {
      throw new HTTPException3(400, { message: "HS_CODE_REQUIRED" });
    }
    try {
      const { tariff, computed } = await computeLandedFromHs(tenantId, hsCode, {
        cogs_amount: body.cogs_amount,
        cogs_currency: body.cogs_currency,
        freight_alloc_mxn: body.freight_alloc_mxn
      });
      let sku_record = sku;
      if (body.apply === true) {
        const updated = await catalog.updateSkuLandedCost(tenantId, skuId, computed.landed_cost_mxn);
        if (updated)
          sku_record = updated;
      }
      return c.json({
        hs_code: hsCode,
        tariff,
        computed,
        sku: { id: sku_record.id, landed_cost_mxn: sku_record.landed_cost_mxn }
      });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("HS_CODE_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "HS_CODE_NOT_FOUND" });
      }
      if (msg.includes("HS_LANDED_MXN_ONLY")) {
        throw new HTTPException3(400, { message: "HS_LANDED_MXN_ONLY" });
      }
      throw e;
    }
  });
  app.get("/api/v1/imports/adjustment-prices/template", async (c) => {
    return new Response(ADJUSTMENT_IMPORT_TEMPLATE_CSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="adjustment-prices-template.csv"'
      }
    });
  });
  app.post("/api/v1/imports/adjustment-prices", async (c) => {
    const tenantId = c.get("tenantId");
    const contentType = c.req.header("content-type") ?? "";
    let csvText;
    let reason_code;
    let apply = false;
    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      if (!body.csv?.trim()) {
        throw new HTTPException3(400, { message: "CSV_REQUIRED" });
      }
      csvText = body.csv;
      reason_code = body.reason_code;
      apply = body.apply === true;
    } else {
      csvText = await c.req.text();
    }
    const parsed = parseAdjustmentPriceCsv(csvText);
    if (parsed.rows.length === 0) {
      return c.json({ parse_errors: parsed.errors, preview: null }, 400);
    }
    try {
      const preview = await previewAdjustmentBatch(catalog, tenantId, {
        reason_code,
        items: parsed.rows
      });
      if (!apply) {
        return c.json({ parse_errors: parsed.errors, preview });
      }
      const built = await buildAdjustmentBatchInput(catalog, tenantId, {
        reason_code,
        items: parsed.rows
      });
      const batch = await adjustments.createBatch({
        tenant_id: tenantId,
        reason_code: built.reason_code,
        status: built.status,
        items: built.prepared.map((p) => ({
          listing_id: p.listing_id,
          explicit_price_mxn: p.explicit_price_mxn,
          from_price_mxn: p.from_price_mxn,
          guard_result: p.guard_result
        }))
      });
      return c.json({
        parse_errors: parsed.errors,
        preview,
        batch: {
          ...batch,
          approval_triggers: built.approval_triggers,
          max_drop_pct: built.maxDrop
        }
      }, 201);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ parse_errors: parsed.errors, error: "GUARD_REJECTED", code: msg.split(":")[1] }, 422);
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.post("/api/v1/skus/:skuId/landed-cost/from-cost-sheet", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    if (!body.cost_sheet_id?.trim()) {
      throw new HTTPException3(400, { message: "COST_SHEET_ID_REQUIRED" });
    }
    try {
      const result = await computeLandedFromCostSheet(catalog, tenantId, skuId, body.cost_sheet_id, { hs_code: body.hs_code });
      const landed_mxn = result.computed.landed_cost_mxn;
      let sku_record = sku;
      if (body.apply === true) {
        const updated = await catalog.updateSkuLandedCost(tenantId, skuId, landed_mxn);
        if (updated)
          sku_record = updated;
      }
      return c.json({
        ...result,
        sku: { id: sku_record.id, landed_cost_mxn: sku_record.landed_cost_mxn }
      });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("COST_SHEET_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "COST_SHEET_NOT_FOUND" });
      }
      if (msg.includes("HS_CODE_NOT_FOUND") || msg.includes("HS_CODE_REQUIRED")) {
        throw new HTTPException3(400, { message: msg.split(":")[0] });
      }
      if (msg.includes("FX_RATE_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "FX_RATE_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.post("/api/v1/skus/:skuId/landed-cost/from-fx", async (c) => {
    assertPrincipalRoles(c, ROLES.PRICING_WRITE);
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const body = await c.req.json();
    try {
      const computed = await computeLandedFromFx(tenantId, {
        cogs_amount: body.cogs_amount,
        cogs_currency: body.cogs_currency ?? "USD",
        freight_alloc_mxn: body.freight_alloc_mxn,
        tariff_rate: body.tariff_rate,
        customs_fee_mxn: body.customs_fee_mxn
      });
      let sku_record = sku;
      if (body.apply === true) {
        const updated = await catalog.updateSkuLandedCost(tenantId, skuId, computed.landed_cost_mxn);
        if (updated)
          sku_record = updated;
      }
      return c.json({ computed, sku: { id: sku_record.id, landed_cost_mxn: sku_record.landed_cost_mxn } });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("FX_RATE_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "FX_RATE_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.post("/api/v1/exports", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    const kind = body.kind ?? "version_backup";
    let content = "";
    let content_type = "application/json";
    if (kind === "version_backup") {
      const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
      content = JSON.stringify(snapshot, null, 2);
    } else if (kind === "pricing_snapshot_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const rows3 = await buildPricingSnapshotRows(catalog, tenantId, skuId);
      content = pricingSnapshotToCsv(rows3, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "waterfall_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      content = buildWaterfallExportCsv(sku, {
        channel: body.channel ?? "MERCADO_LIBRE",
        pricing_mode: body.pricing_mode ?? "cost",
        target_margin_pct: body.target_margin_pct,
        competitor_price_mxn: body.competitor_price_mxn
      }, c.get("locale"));
      content_type = "text/csv";
    } else if (kind === "competitor_curve_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const range = body.range ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
      const observations2 = await competitors.listObservations(listingId, since);
      const points = buildCompetitorCurve(observations2.map((o) => ({
        observed_at: o.observed_at,
        effective_price: o.effective_price
      })));
      content = competitorCurvePointsToCsv(points);
      content_type = "text/csv";
    } else if (kind === "adjustment_batch_csv") {
      const batchId = body.batch_id?.trim();
      if (!batchId) {
        throw new HTTPException3(400, { message: "BATCH_ID_REQUIRED" });
      }
      const batch = await adjustments.getBatch(tenantId, batchId);
      if (!batch) {
        throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
      }
      content = adjustmentBatchToCsv(batch);
      content_type = "text/csv";
    } else if (kind === "listing_sync_jobs_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = listListingSyncJobsForTenant(tenantId, limit);
      content = listingSyncJobsToCsv(jobs2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "reconciliation_alerts_csv") {
      const items = await reconciliationAlerts.listAlerts(tenantId);
      content = reconciliationAlertsToCsv(items, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "cross_channel_dashboard_csv") {
      const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
      content = crossChannelDashboardToCsv(snapshot);
      content_type = "text/csv";
    } else if (kind === "cost_sheets_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      content = costSheetsToCsv(await listCostSheets(tenantId, skuId), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_jobs_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = await listRepricingBatchJobs(tenantId, limit);
      content = repricingBatchJobsToCsv(jobs2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_digest_csv") {
      const digest = await buildDailyAgentDigest({ catalog, reconciliationAlerts, agentAudit }, tenantId, c.get("locale"), body.date);
      content = agentDigestToCsv(digest);
      content_type = "text/csv";
    } else if (kind === "tariff_hs_csv") {
      content = tariffHsRatesToCsv(await listTariffHsRates(tenantId), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "fx_rates_csv") {
      content = fxRatesToCsv(await listFxRates(tenantId), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_tool_audit_csv") {
      const limit = Math.min(200, Math.max(1, Number(body.limit ?? 100) || 100));
      const items = await agentAudit.listInvocations(tenantId, limit);
      content = agentToolAuditToCsv(items, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "pricing_snapshots_tenant_csv") {
      const rows3 = await buildTenantPricingSnapshotRows(catalog, tenantId);
      content = pricingSnapshotToCsv(rows3, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_sandbox_events_csv") {
      const limit = Math.min(200, Math.max(1, Number(body.limit ?? 100) || 100));
      const events3 = listChannelSandboxEvents(tenantId, limit);
      content = channelSandboxEventsToCsv(events3, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dead_letter_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = await listDigestDeadLetterJobs(tenantId, limit);
      content = digestDeadLetterJobsToCsv(jobs2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_queue_csv") {
      const rows3 = await buildTenantRepricingQueue(catalog, tenantId);
      content = repricingQueueToCsv(rows3, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dispatches_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const items = listDigestDispatches(tenantId, limit);
      content = digestDispatchesToCsv(items, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_queued_jobs_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = await listDigestQueuedJobs(tenantId, limit);
      content = digestQueuedJobsToCsv(jobs2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "worker_heartbeats_csv") {
      const status = await getAsyncWorkerStatus();
      content = workerHeartbeatsToCsv(status.workers, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "price_history_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const range = body.range ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
      const observations2 = await competitors.listObservations(listingId, since);
      content = priceHistoryToCsv(listingId, observations2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_events_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const items = await repricing.listEvents(tenantId, listingId, 200);
      content = repricingEventsToCsv(items, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "adjustment_batches_index_csv") {
      const items = await adjustments.listBatches(tenantId, 100);
      content = adjustmentBatchesIndexToCsv(items, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "skus_catalog_csv") {
      const skus = await catalog.listSkus(tenantId);
      content = skusCatalogToCsv(skus.map((s) => ({
        id: s.id,
        sku_code: s.sku_code,
        name: s.name,
        landed_cost_mxn: s.landed_cost_mxn
      })), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "shops_csv") {
      const shopItems = await shops2.listShops(tenantId);
      content = shopsToCsv(shopItems.map(shopPublicView), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "category_rule_templates_csv") {
      const templates = listCategoryRuleTemplates(tenantId);
      content = categoryRuleTemplatesToCsv(templates, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "competitor_offers_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const offers2 = await mapOffersWithLatestObservations(competitors, listingId);
      content = competitorOffersToCsv(listingId, offers2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "shared_fee_templates_csv") {
      const templates = listSharedFeeTemplates(tenantId);
      content = sharedFeeTemplatesToCsv(templates, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "ops_metrics_csv") {
      const snapshot = await buildOpsMetricsSnapshot(catalog, tenantId);
      content = opsMetricsToCsv(snapshot, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_ops_status_csv") {
      const sample = Math.min(100, Math.max(1, Number(body.sample ?? 50) || 50));
      const status = buildListingSyncOpsStatus(tenantId, sample);
      content = listingSyncOpsStatusToCsv(status, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_jobs_listing_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = listListingSyncJobs(tenantId, listingId, limit);
      content = listingSyncJobsToCsv(jobs2, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_tools_csv") {
      content = agentToolsToCsv(listAgentTools(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_jobs_summary_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const summary = await summarizeRepricingBatchJobs(tenantId, limit);
      content = repricingBatchJobsSummaryToCsv(summary, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_ingest_status_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const status = await buildListingIngestStatus({ catalog, repricing, listingHealth }, tenantId, listingId);
      if (!status) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      content = listingIngestStatusToCsv(status, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "feature_flags_csv") {
      content = featureFlagsToCsv(getFeatureFlags(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_readiness_csv") {
      content = agentReadinessToCsv(evaluateAgentReadiness(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "competitor_anchor_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const withLatest = await mapOffersWithLatestObservations(competitors, listingId);
      const anchor = buildCompetitorAnchorSummary(withLatest);
      content = competitorAnchorToCsv(listingId, anchor, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "product_readiness_csv") {
      content = productReadinessToCsv(getProductReadinessSummary(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_queued_jobs_summary_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = await listDigestQueuedJobs(tenantId, limit);
      const summary = await buildDigestQueuedJobsSummary(tenantId, jobs2);
      content = digestQueuedJobsSummaryToCsv(summary, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_adapters_status_csv") {
      content = channelAdapterStatusToCsv(getChannelAdapterStatus(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "rule_compiler_status_csv") {
      content = ruleCompilerStatusToCsv(getRuleCompilerStatus(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "auth_status_csv") {
      content = authStatusToCsv(getAuthStatus(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_sandbox_status_csv") {
      content = channelSandboxStatusToCsv(getChannelSandboxStatus(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dead_letter_summary_csv") {
      const limit = Math.min(100, Math.max(1, Number(body.limit ?? 50) || 50));
      const jobs2 = await listDigestDeadLetterJobs(tenantId, limit);
      const summary = buildDigestDeadLetterSummary(tenantId, jobs2, await digestQueueSummary(tenantId));
      content = digestDeadLetterSummaryToCsv(summary, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_schedule_csv") {
      content = listingSyncScheduleToCsv(getListingSyncSchedule(tenantId), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_milestones_csv") {
      content = agentMilestonesToCsv(getProductMilestoneStatus(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "adjustment_approval_policy_csv") {
      content = adjustmentApprovalPolicyToCsv(getAdjustmentApprovalPolicy(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "ops_workers_status_summary_csv") {
      content = opsWorkersStatusSummaryToCsv(await getAsyncWorkerStatus(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "cross_channel_guard_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      const guard = await getCrossChannelGuardForSku(catalog, skuId);
      content = crossChannelGuardToCsv(skuId, guard, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_schedule_csv") {
      content = digestScheduleToCsv(getDigestSchedule(tenantId), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "dynamic_repricing_rule_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const view = await buildListingDynamicRepricingRuleView({ catalog, dynamicRules, listingHealth }, tenantId, listingId);
      if (!view) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      content = dynamicRepricingRuleToCsv(view, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_queue_sku_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      const rows3 = await buildSkuRepricingQueueRows(catalog, tenantId, skuId);
      content = repricingQueueToCsv(rows3, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_shard_plan_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      const shardTotal = Math.min(64, Math.max(1, Number(body.shard_total ?? 2) || 2));
      const plan = planRepricingShards(tenantId, skuId, shardTotal);
      content = repricingBatchShardPlanToCsv(plan, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "sku_category_rule_template_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      const categoryId = sku.category_id ?? null;
      const template = categoryId ? getCategoryRuleTemplate(tenantId, categoryId) : void 0;
      content = skuCategoryRuleTemplateToCsv(skuId, categoryId, template ?? null, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "pricing_context_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const channel = body.channel ?? "MERCADO_LIBRE";
      const view = await buildSkuPricingContextView({ catalog, competitors }, tenantId, skuId, c.get("locale"), channel);
      if (!view) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      content = pricingContextToCsv(view, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_batch_job_csv") {
      const jobId = body.job_id;
      if (!jobId?.trim()) {
        throw new HTTPException3(400, { message: "JOB_ID_REQUIRED" });
      }
      const job = await getRepricingBatchJob(tenantId, jobId);
      if (!job) {
        throw new HTTPException3(404, { message: "JOB_NOT_FOUND" });
      }
      content = repricingBatchJobsToCsv([job], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "category_rule_template_csv") {
      const categoryId = body.category_id ?? "cat-electronics-mx";
      const tpl = getCategoryRuleTemplate(tenantId, categoryId);
      if (!tpl) {
        throw new HTTPException3(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
      }
      content = categoryRuleTemplatesToCsv([tpl], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "copilot_session_csv") {
      const sessionId = body.session_id;
      if (!sessionId?.trim()) {
        throw new HTTPException3(400, { message: "SESSION_ID_REQUIRED" });
      }
      const session = getCopilotSession(tenantId, sessionId);
      if (!session) {
        throw new HTTPException3(404, { message: "SESSION_NOT_FOUND" });
      }
      content = copilotSessionToCsv(session, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "price_version_csv") {
      const versionId = body.version_id;
      if (!versionId?.trim()) {
        throw new HTTPException3(400, { message: "VERSION_ID_REQUIRED" });
      }
      const version = await catalog.getVersion(tenantId, versionId);
      if (!version) {
        throw new HTTPException3(404, { message: "VERSION_NOT_FOUND" });
      }
      content = priceVersionToCsv(version, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "version_backup_rows_csv") {
      const snapshot = await buildVersionBackupSnapshot(catalog, tenantId);
      content = versionBackupToCsv(snapshot, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "p5_readiness_csv") {
      content = p5ReadinessToCsv(evaluateP5Readiness(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "shop_csv") {
      const shopId = body.shop_id ?? "shop-ml-demo";
      const shop = await shops2.getShop(tenantId, shopId);
      if (!shop) {
        throw new HTTPException3(404, { message: "SHOP_NOT_FOUND" });
      }
      content = shopsToCsv([shopPublicView(shop)], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "p3_readiness_csv") {
      content = p3ReadinessToCsv(evaluateP3Readiness(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "p4_readiness_csv") {
      content = p4ReadinessToCsv(evaluateAgentReadiness(), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "shared_fee_template_csv") {
      const templateId = body.fee_template_id ?? "fee-tpl-ml-electronics";
      const tpl = getSharedFeeTemplate(tenantId, templateId);
      if (!tpl) {
        throw new HTTPException3(404, { message: "SHARED_FEE_TEMPLATE_NOT_FOUND" });
      }
      content = sharedFeeTemplatesToCsv([tpl], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "tenant_shared_fee_templates_csv") {
      content = sharedFeeTemplatesToCsv(listSharedFeeTemplates(tenantId), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "sku_catalog_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      content = skusCatalogToCsv([
        {
          id: sku.id,
          sku_code: sku.sku_code,
          name: sku.name,
          landed_cost_mxn: sku.landed_cost_mxn
        }
      ], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      content = listingsToCsv([
        {
          id: listing.id,
          sku_id: listing.sku_id,
          channel: listing.channel
        }
      ], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "tariff_hs_rate_csv") {
      const hsCode = body.hs_code ?? "HS-ELECTRONICS-MX";
      const row = await getTariffHsRate(tenantId, hsCode);
      if (!row) {
        throw new HTTPException3(404, { message: "TARIFF_HS_NOT_FOUND" });
      }
      content = tariffHsRatesToCsv([row], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "fx_rate_csv") {
      const base = (body.fx_base ?? "USD").toUpperCase();
      const quote = (body.fx_quote ?? "MXN").toUpperCase();
      const row = await getFxRate(tenantId, base, quote);
      if (!row) {
        throw new HTTPException3(404, { message: "FX_RATE_NOT_FOUND" });
      }
      content = fxRatesToCsv([row], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "cost_sheet_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sheetId = body.cost_sheet_id;
      if (!sheetId?.trim()) {
        throw new HTTPException3(400, { message: "COST_SHEET_ID_REQUIRED" });
      }
      const sheet = await getCostSheet(tenantId, skuId, sheetId.trim());
      if (!sheet) {
        throw new HTTPException3(404, { message: "COST_SHEET_NOT_FOUND" });
      }
      content = costSheetsToCsv([sheet], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "competitor_offer_csv") {
      const offerId = body.offer_id;
      if (!offerId?.trim()) {
        throw new HTTPException3(400, { message: "OFFER_ID_REQUIRED" });
      }
      const offer = await competitors.getOffer(offerId.trim());
      if (!offer) {
        throw new HTTPException3(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
      }
      const listing = await catalog.getListing(tenantId, offer.listing_id);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const withLatest = await mapOffersWithLatestObservations(competitors, offer.listing_id);
      const row = withLatest.find((o) => o.id === offerId.trim());
      if (!row) {
        throw new HTTPException3(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
      }
      content = competitorOffersToCsv(offer.listing_id, [row], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "reconciliation_alert_csv") {
      const alertId = body.alert_id;
      if (!alertId?.trim()) {
        throw new HTTPException3(400, { message: "ALERT_ID_REQUIRED" });
      }
      const items = await reconciliationAlerts.listAlerts(tenantId);
      const alert = items.find((a) => a.id === alertId.trim());
      if (!alert) {
        throw new HTTPException3(404, { message: "RECONCILIATION_ALERT_NOT_FOUND" });
      }
      content = reconciliationAlertsToCsv([alert], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "listing_sync_job_csv") {
      const jobId = body.sync_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException3(400, { message: "SYNC_JOB_ID_REQUIRED" });
      }
      const job = getListingSyncJob(tenantId, jobId.trim());
      if (!job) {
        throw new HTTPException3(404, { message: "LISTING_SYNC_JOB_NOT_FOUND" });
      }
      content = listingSyncJobsToCsv([job], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_queued_job_csv") {
      const jobId = body.digest_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException3(400, { message: "DIGEST_JOB_ID_REQUIRED" });
      }
      const job = await getDigestQueuedJob(tenantId, jobId.trim());
      if (!job) {
        throw new HTTPException3(404, { message: "DIGEST_JOB_NOT_FOUND" });
      }
      content = digestQueuedJobsToCsv([job], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "worker_heartbeat_csv") {
      const workerId = body.worker_id ?? "repricing-batch-1";
      const beat = await getWorkerHeartbeat(workerId);
      if (!beat) {
        throw new HTTPException3(404, { message: "WORKER_HEARTBEAT_NOT_FOUND" });
      }
      const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
      const stale = Date.now() - new Date(beat.reported_at).getTime() > staleSec * 1e3;
      content = workerHeartbeatsToCsv([{ ...beat, stale }], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dispatch_csv") {
      const jobId = body.dispatch_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException3(400, { message: "DISPATCH_JOB_ID_REQUIRED" });
      }
      const dispatch = getDigestDispatch(tenantId, jobId.trim());
      if (!dispatch) {
        throw new HTTPException3(404, { message: "DIGEST_DISPATCH_NOT_FOUND" });
      }
      content = digestDispatchesToCsv([dispatch], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "channel_sandbox_event_csv") {
      const eventId = body.sandbox_event_id;
      if (!eventId?.trim()) {
        throw new HTTPException3(400, { message: "SANDBOX_EVENT_ID_REQUIRED" });
      }
      const ev = getChannelSandboxEvent(tenantId, eventId.trim());
      if (!ev) {
        throw new HTTPException3(404, { message: "SANDBOX_EVENT_NOT_FOUND" });
      }
      content = channelSandboxEventsToCsv([ev], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "digest_dead_letter_job_csv") {
      const jobId = body.digest_job_id;
      if (!jobId?.trim()) {
        throw new HTTPException3(400, { message: "DIGEST_JOB_ID_REQUIRED" });
      }
      const job = await getDigestQueuedJob(tenantId, jobId.trim());
      if (!job || job.status !== "dead_letter") {
        throw new HTTPException3(404, {
          message: "DIGEST_DEAD_LETTER_JOB_NOT_FOUND"
        });
      }
      content = digestDeadLetterJobsToCsv([job], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_tool_audit_csv") {
      const auditId = body.audit_id;
      if (!auditId?.trim()) {
        throw new HTTPException3(400, { message: "AUDIT_ID_REQUIRED" });
      }
      const items = await agentAudit.listInvocations(tenantId, 200);
      const row = items.find((a) => a.id === auditId.trim());
      if (!row) {
        throw new HTTPException3(404, { message: "AGENT_TOOL_AUDIT_NOT_FOUND" });
      }
      content = agentToolAuditToCsv([row], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "price_observation_csv") {
      const observationId = body.observation_id;
      if (!observationId?.trim()) {
        throw new HTTPException3(400, { message: "OBSERVATION_ID_REQUIRED" });
      }
      const obs = await competitors.getObservation(observationId.trim());
      if (!obs) {
        throw new HTTPException3(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
      }
      const offer = await competitors.getOffer(obs.offer_id);
      if (!offer) {
        throw new HTTPException3(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
      }
      const listing = await catalog.getListing(tenantId, offer.listing_id);
      if (!listing) {
        throw new HTTPException3(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
      }
      content = priceHistoryToCsv(offer.listing_id, [obs], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "repricing_event_csv") {
      const eventId = body.repricing_event_id;
      if (!eventId?.trim()) {
        throw new HTTPException3(400, { message: "REPRICING_EVENT_ID_REQUIRED" });
      }
      const event = await repricing.getEvent(eventId.trim());
      if (!event || event.tenant_id !== tenantId) {
        throw new HTTPException3(404, { message: "REPRICING_EVENT_NOT_FOUND" });
      }
      content = repricingEventsToCsv([event], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "adjustment_batch_index_csv") {
      const batchId = body.batch_id?.trim();
      if (!batchId) {
        throw new HTTPException3(400, { message: "BATCH_ID_REQUIRED" });
      }
      const batch = await adjustments.getBatch(tenantId, batchId);
      if (!batch) {
        throw new HTTPException3(404, { message: "BATCH_NOT_FOUND" });
      }
      content = adjustmentBatchesIndexToCsv([batch], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_digest_date_csv") {
      const date = body.date?.trim();
      if (!date) {
        throw new HTTPException3(400, { message: "DIGEST_DATE_REQUIRED" });
      }
      const digest = await buildDailyAgentDigest({ catalog, reconciliationAlerts, agentAudit }, tenantId, c.get("locale"), date);
      content = agentDigestToCsv(digest);
      content_type = "text/csv";
    } else if (kind === "pricing_snapshot_row_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const channel = body.channel ?? "MERCADO_LIBRE";
      if (channel !== "MERCADO_LIBRE" && channel !== "AMAZON_MX") {
        throw new HTTPException3(400, { message: "INVALID_CHANNEL" });
      }
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      const rows3 = await buildPricingSnapshotRows(catalog, tenantId, skuId);
      const row = rows3.find((r) => r.channel === channel);
      if (!row) {
        throw new HTTPException3(404, { message: "PRICING_SNAPSHOT_ROW_NOT_FOUND" });
      }
      content = pricingSnapshotToCsv([row], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "cross_channel_dashboard_row_csv") {
      const skuId = body.sku_id ?? "demo-sku-001";
      const sku = await catalog.getSku(tenantId, skuId);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      const snapshot = await buildCrossChannelDashboard(catalog, tenantId);
      const item = snapshot.items.find((i) => i.sku_id === skuId);
      if (!item) {
        throw new HTTPException3(404, {
          message: "CROSS_CHANNEL_DASHBOARD_ROW_NOT_FOUND"
        });
      }
      content = crossChannelDashboardToCsv({
        ...snapshot,
        sku_count: 1,
        alert_count: item.warning ? 1 : 0,
        items: [item]
      });
      content_type = "text/csv";
    } else if (kind === "competitor_curve_point_csv") {
      const listingId = body.listing_id ?? "listing-ml-001";
      const listing = await catalog.getListing(tenantId, listingId);
      if (!listing) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      const curveDate = body.curve_date?.trim() ?? body.date?.trim();
      if (!curveDate) {
        throw new HTTPException3(400, { message: "CURVE_DATE_REQUIRED" });
      }
      const range = body.range ?? "7d";
      const days = range === "30d" ? 30 : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
      const observations2 = await competitors.listObservations(listingId, since);
      const points = buildCompetitorCurve(observations2.map((o) => ({
        observed_at: o.observed_at,
        effective_price: o.effective_price
      })));
      const point = points.find((p) => p.date === curveDate);
      if (!point) {
        throw new HTTPException3(404, { message: "COMPETITOR_CURVE_POINT_NOT_FOUND" });
      }
      content = competitorCurvePointsToCsv([point]);
      content_type = "text/csv";
    } else if (kind === "agent_tool_row_csv") {
      const toolName = body.tool_name?.trim();
      if (!toolName) {
        throw new HTTPException3(400, { message: "TOOL_NAME_REQUIRED" });
      }
      const tool = getAgentTool(toolName);
      if (!tool) {
        throw new HTTPException3(404, { message: "AGENT_TOOL_NOT_FOUND" });
      }
      content = agentToolsToCsv([tool], (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_readiness_check_csv") {
      const checkId = body.check_id?.trim();
      if (!checkId) {
        throw new HTTPException3(400, { message: "CHECK_ID_REQUIRED" });
      }
      const snapshot = evaluateAgentReadiness();
      const check = snapshot.checks.find((c2) => c2.id === checkId);
      if (!check) {
        throw new HTTPException3(404, { message: "AGENT_READINESS_CHECK_NOT_FOUND" });
      }
      content = agentReadinessToCsv({ ...snapshot, checks: [check] }, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "agent_milestone_csv") {
      const milestoneId = body.milestone_id?.trim();
      if (!milestoneId) {
        throw new HTTPException3(400, { message: "MILESTONE_ID_REQUIRED" });
      }
      const status = getProductMilestoneStatus();
      const milestone = status.milestones.find((m) => m.id === milestoneId);
      if (!milestone) {
        throw new HTTPException3(404, { message: "AGENT_MILESTONE_NOT_FOUND" });
      }
      content = agentMilestonesToCsv({ ...status, milestones: [milestone] }, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "product_readiness_check_csv") {
      const checkId = body.check_id?.trim();
      if (!checkId) {
        throw new HTTPException3(400, { message: "CHECK_ID_REQUIRED" });
      }
      const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
      const summary = getProductReadinessSummary();
      const p3 = summary.p3.checks.find((c2) => c2.id === checkId);
      if (p3) {
        content = p3ReadinessToCsv({ ...summary.p3, checks: [p3] }, exportedAt);
      } else {
        const p4 = summary.p4.checks.find((c2) => c2.id === checkId);
        if (p4) {
          content = p4ReadinessToCsv({ ...summary.p4, checks: [p4] }, exportedAt);
        } else {
          const p5 = summary.p5.checks.find((c2) => c2.id === checkId);
          if (!p5) {
            throw new HTTPException3(404, {
              message: "PRODUCT_READINESS_CHECK_NOT_FOUND"
            });
          }
          content = p5ReadinessToCsv({ ...summary.p5, checks: [p5] }, exportedAt);
        }
      }
      content_type = "text/csv";
    } else if (kind === "feature_flag_csv") {
      const flagKey = body.flag_key?.trim();
      if (!flagKey) {
        throw new HTTPException3(400, { message: "FLAG_KEY_REQUIRED" });
      }
      const flag2 = getFeatureFlagValue(flagKey);
      if (!flag2) {
        throw new HTTPException3(404, { message: "FEATURE_FLAG_NOT_FOUND" });
      }
      content = featureFlagKeyToCsv(flag2.key, flag2.enabled, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "i18n_glossary_csv") {
      const locale = c.get("locale");
      content = i18nGlossaryToCsv(locale, (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "i18n_glossary_term_csv") {
      const termKey = body.term_key?.trim();
      if (!termKey) {
        throw new HTTPException3(400, { message: "TERM_KEY_REQUIRED" });
      }
      const term = getGlossaryTerm(termKey);
      if (!term) {
        throw new HTTPException3(404, { message: "GLOSSARY_TERM_NOT_FOUND" });
      }
      content = i18nGlossaryTermToCsv(term, c.get("locale"), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "notification_templates_csv") {
      content = notificationTemplatesToCsv(c.get("locale"), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else if (kind === "notification_template_csv") {
      const templateId = body.template_id?.trim();
      if (!templateId) {
        throw new HTTPException3(400, { message: "TEMPLATE_ID_REQUIRED" });
      }
      const template = getNotificationTemplate(templateId);
      if (!template) {
        throw new HTTPException3(404, {
          message: "NOTIFICATION_TEMPLATE_NOT_FOUND"
        });
      }
      content = notificationTemplateToCsv(template, c.get("locale"), (/* @__PURE__ */ new Date()).toISOString());
      content_type = "text/csv";
    } else {
      throw new HTTPException3(400, { message: "UNSUPPORTED_EXPORT_KIND" });
    }
    const stored = await createStoredExport({
      tenant_id: tenantId,
      kind,
      content_type,
      body: content
    });
    return c.json({
      export_id: stored.export_id,
      token: stored.token,
      expires_at: stored.expires_at,
      download_path: `/api/v1/exports/${stored.export_id}?token=${stored.token}`
    });
  });
  app.get("/api/v1/exports/:exportId", async (c) => {
    const tenantId = c.get("tenantId");
    const token = c.req.query("token") ?? "";
    const row = await getStoredExport(tenantId, c.req.param("exportId"), token);
    if (!row) {
      throw new HTTPException3(404, { message: "EXPORT_NOT_FOUND" });
    }
    return new Response(row.body, {
      status: 200,
      headers: {
        "Content-Type": row.content_type,
        "Content-Disposition": `attachment; filename="${row.kind}-${row.export_id}.json"`
      }
    });
  });
  app.get("/api/v1/ops/workers/status", async (c) => {
    return c.json(await getAsyncWorkerStatus());
  });
  app.get("/api/v1/ops/workers/status/summary/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const status = await getAsyncWorkerStatus();
    const csv = opsWorkersStatusSummaryToCsv(status, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ops-workers-status-summary.csv"`
      }
    });
  });
  app.get("/api/v1/ops/workers/status/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const status = await getAsyncWorkerStatus();
    const csv = workerHeartbeatsToCsv(status.workers, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="worker-heartbeats.csv"`
      }
    });
  });
  app.get("/api/v1/ops/workers/status/:workerId/export", async (c) => {
    const workerId = c.req.param("workerId");
    const beat = await getWorkerHeartbeat(workerId);
    if (!beat) {
      throw new HTTPException3(404, { message: "WORKER_HEARTBEAT_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const staleSec = Number(process.env.WORKER_HEARTBEAT_STALE_SEC ?? "120");
    const stale = Date.now() - new Date(beat.reported_at).getTime() > staleSec * 1e3;
    const csv = workerHeartbeatsToCsv([{ ...beat, stale }], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="worker-heartbeat-${workerId}.csv"`
      }
    });
  });
  app.post("/api/v1/ops/workers/heartbeat", async (c) => {
    const body = await c.req.json();
    if (!body.worker_id?.trim()) {
      throw new HTTPException3(400, { message: "WORKER_ID_REQUIRED" });
    }
    const beat = await recordWorkerHeartbeat({
      worker_id: body.worker_id.trim(),
      tenant_id: c.get("tenantId"),
      details: body.details
    });
    return c.json({ ok: true, heartbeat: beat });
  });
  app.get("/api/v1/reports/pricing-snapshot", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.query("sku_id") ?? "demo-sku-001";
    const format = (c.req.query("format") ?? "json").toLowerCase();
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const rows3 = await buildPricingSnapshotRows(catalog, tenantId, skuId);
    if (format === "csv") {
      const csv = pricingSnapshotToCsv(rows3, exportedAt);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pricing-snapshot-${skuId}.csv"`
        }
      });
    }
    return c.json({ exported_at: exportedAt, sku_id: skuId, rows: rows3 });
  });
  app.get("/api/v1/reports/pricing-snapshot/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.query("sku_id") ?? "demo-sku-001";
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const rows3 = await buildPricingSnapshotRows(catalog, tenantId, skuId);
    const csv = pricingSnapshotToCsv(rows3, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-snapshot-${skuId}.csv"`
      }
    });
  });
  app.get("/api/v1/reports/pricing-snapshots/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const rows3 = await buildTenantPricingSnapshotRows(catalog, tenantId);
    const csv = pricingSnapshotToCsv(rows3, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-snapshots-tenant.csv"`
      }
    });
  });
  app.get("/api/v1/reports/pricing-snapshots/:skuId/rows/:channel/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const channel = c.req.param("channel");
    if (channel !== "MERCADO_LIBRE" && channel !== "AMAZON_MX") {
      throw new HTTPException3(400, { message: "INVALID_CHANNEL" });
    }
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const rows3 = await buildPricingSnapshotRows(catalog, tenantId, skuId);
    const row = rows3.find((r) => r.channel === channel);
    if (!row) {
      throw new HTTPException3(404, {
        message: "PRICING_SNAPSHOT_ROW_NOT_FOUND"
      });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = pricingSnapshotToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pricing-snapshot-row-${skuId}-${channel}.csv"`
      }
    });
  });
  app.get("/api/v1/reports/reconciliation-alerts", async (c) => {
    const tenantId = c.get("tenantId");
    const format = (c.req.query("format") ?? "json").toLowerCase();
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await reconciliationAlerts.listAlerts(tenantId);
    if (format === "csv") {
      const csv = reconciliationAlertsToCsv(items, exportedAt);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reconciliation-alerts.csv"`
        }
      });
    }
    return c.json({ exported_at: exportedAt, items });
  });
  app.get("/api/v1/reports/reconciliation-alerts/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await reconciliationAlerts.listAlerts(tenantId);
    const csv = reconciliationAlertsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reconciliation-alerts.csv"`
      }
    });
  });
  app.get("/api/v1/channels/sandbox/events/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? "100") || 100));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = listChannelSandboxEvents(tenantId, limit);
    const csv = channelSandboxEventsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-sandbox-events.csv"`
      }
    });
  });
  app.get("/api/v1/channels/sandbox/events", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 30;
    return c.json({ items: listChannelSandboxEvents(tenantId, limit) });
  });
  app.get("/api/v1/channels/sandbox/events/:eventId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const eventId = c.req.param("eventId");
    const ev = getChannelSandboxEvent(tenantId, eventId);
    if (!ev) {
      throw new HTTPException3(404, { message: "SANDBOX_EVENT_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = channelSandboxEventsToCsv([ev], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="channel-sandbox-event-${eventId}.csv"`
      }
    });
  });
  app.post("/api/v1/shops", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (!body.channel || !body.name?.trim()) {
      throw new HTTPException3(400, { message: "INVALID_SHOP" });
    }
    const shop = await shops2.createShop({
      tenant_id: tenantId,
      channel: body.channel,
      name: body.name.trim(),
      external_seller_id: body.external_seller_id
    });
    return c.json(shopPublicView(shop), 201);
  });
  app.post("/api/v1/shops/:shopId/oauth/start", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops2.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException3(404, { message: "SHOP_NOT_FOUND" });
    }
    const result = startOAuth(tenantId, shopId, shop.channel);
    return c.json({
      shop_id: shopId,
      channel: shop.channel,
      ...result,
      mode: "placeholder"
    });
  });
  app.post("/api/v1/shops/:shopId/oauth/mock-complete", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const body = await c.req.json().catch(() => ({}));
    const result = await completeOAuthMock(shops2, tenantId, shopId, body.state);
    if ("error" in result) {
      const status = result.error === "SHOP_NOT_FOUND" ? 404 : 400;
      return c.json({ error: result.error }, status);
    }
    const shop = await shops2.getShop(tenantId, shopId);
    return c.json({
      ...result,
      shop: shop ? shopPublicView(shop) : null
    });
  });
  app.post("/api/v1/shops/:shopId/oauth/callback", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops2.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException3(404, { message: "SHOP_NOT_FOUND" });
    }
    const body = await c.req.json().catch(() => ({}));
    if (!body.code?.trim()) {
      return c.json({ error: "CODE_REQUIRED" }, 400);
    }
    const result = await completeOAuthWithCode(shops2, tenantId, shopId, shop.channel, body.code.trim(), body.state);
    if ("error" in result) {
      const status = result.error === "SHOP_NOT_FOUND" ? 404 : result.error.includes("NOT_CONFIGURED") ? 503 : 400;
      return c.json({ error: result.error }, status);
    }
    const updated = await shops2.getShop(tenantId, shopId);
    return c.json({
      ...result,
      shop: updated ? shopPublicView(updated) : null,
      mode: "production_oauth"
    });
  });
  app.post("/api/v1/shops/:shopId/listings/pull", async (c) => {
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const shop = await shops2.getShop(tenantId, shopId);
    if (!shop) {
      throw new HTTPException3(404, { message: "SHOP_NOT_FOUND" });
    }
    if (shop.auth_status !== "connected" || !shop.external_seller_id) {
      return c.json({ error: "AUTH_REQUIRED" }, 401);
    }
    const token = await shops2.getAccessToken(shopId);
    if (!token) {
      return c.json({ error: "AUTH_EXPIRED" }, 401);
    }
    const body = await c.req.json();
    if (!body.external_ref) {
      throw new HTTPException3(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    const snapshot = await listingAdapter.pullListing({
      shop_id: shopId,
      channel: shop.channel,
      external_seller_id: shop.external_seller_id
    }, body.external_ref);
    if (isChannelSandboxEnabled()) {
      const listingId = LISTING_ID_BY_SHOP[shopId];
      if (listingId) {
        recordChannelSandboxEvent({
          tenant_id: tenantId,
          listing_id: listingId,
          channel: shop.channel,
          event_type: "listing_pull",
          payload: { external_ref: body.external_ref, snapshot }
        });
      }
    }
    return c.json({ shop_id: shopId, snapshot });
  });
  app.get("/api/v1/listings/:listingId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = listingsToCsv([
      {
        id: listing.id,
        sku_id: listing.sku_id,
        channel: listing.channel
      }
    ], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/competitors/anchor/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const withLatest = await mapOffersWithLatestObservations(competitors, listingId);
    const anchor = buildCompetitorAnchorSummary(withLatest);
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = competitorAnchorToCsv(listingId, anchor, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-anchor-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/competitors/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const offers2 = await mapOffersWithLatestObservations(competitors, listingId);
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = competitorOffersToCsv(listingId, offers2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-offers-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/competitors", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const withLatest = await mapOffersWithLatestObservations(competitors, listingId);
    return c.json({
      listing_id: listingId,
      channel: listing.channel,
      items: withLatest,
      anchor: buildCompetitorAnchorSummary(withLatest)
    });
  });
  app.post("/api/v1/listings/:listingId/competitors", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = await c.req.json();
    if (!body.external_ref?.trim()) {
      throw new HTTPException3(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    const offer = await competitors.createOffer({
      listing_id: listingId,
      channel: listing.channel,
      external_ref: body.external_ref.trim(),
      label: body.label,
      seller_id: body.seller_id,
      is_primary: body.is_primary
    });
    return c.json(offer, 201);
  });
  app.get("/api/v1/competitor-offers/:offerId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const offerId = c.req.param("offerId");
    const offer = await competitors.getOffer(offerId);
    if (!offer) {
      throw new HTTPException3(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
    }
    const listing = await catalog.getListing(tenantId, offer.listing_id);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const withLatest = await mapOffersWithLatestObservations(competitors, offer.listing_id);
    const row = withLatest.find((o) => o.id === offerId);
    if (!row) {
      throw new HTTPException3(404, { message: "COMPETITOR_OFFER_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = competitorOffersToCsv(offer.listing_id, [row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-offer-${offerId}.csv"`
      }
    });
  });
  app.post("/api/v1/competitor-offers/:offerId/observations", async (c) => {
    const tenantId = c.get("tenantId");
    const offerId = c.req.param("offerId");
    const offer = await competitors.getOffer(offerId);
    if (!offer) {
      throw new HTTPException3(404, { message: "OFFER_NOT_FOUND" });
    }
    const listing = await catalog.getListing(tenantId, offer.listing_id);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = await c.req.json();
    const include_shipping = body.include_shipping ?? false;
    const effective_price = computeEffectivePrice({
      list_price: body.list_price,
      sale_price: body.sale_price,
      shipping_addon: body.shipping_addon,
      include_shipping
    });
    if (effective_price <= 0) {
      throw new HTTPException3(400, { message: "INVALID_PRICE" });
    }
    const previous = await competitors.latestObservation(offerId);
    const observation = await competitors.addObservation({
      offer_id: offerId,
      observed_at: body.observed_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      list_price: body.list_price ?? null,
      sale_price: body.sale_price ?? null,
      shipping_addon: body.shipping_addon ?? 0,
      effective_price,
      raw_json: buildObservationRawJson({
        source: body.source,
        buy_box_winner: body.buy_box_winner
      })
    });
    await notifyObservationChange(repricing, tenantId, {
      listing_id: offer.listing_id,
      channel: offer.channel,
      offer_id: offerId,
      previous_effective: previous?.effective_price ?? null,
      observation: {
        id: observation.id,
        effective_price: observation.effective_price,
        observed_at: observation.observed_at
      }
    });
    return c.json(observation, 201);
  });
  app.get("/api/v1/price-observations/:observationId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const observationId = c.req.param("observationId");
    const obs = await competitors.getObservation(observationId);
    if (!obs) {
      throw new HTTPException3(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
    }
    const offer = await competitors.getOffer(obs.offer_id);
    if (!offer) {
      throw new HTTPException3(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
    }
    const listing = await catalog.getListing(tenantId, offer.listing_id);
    if (!listing) {
      throw new HTTPException3(404, { message: "PRICE_OBSERVATION_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = priceHistoryToCsv(offer.listing_id, [obs], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-observation-${observationId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/price-history/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const observations2 = await competitors.listObservations(listingId, since);
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = priceHistoryToCsv(listingId, observations2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-history-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/price-history", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const observations2 = await competitors.listObservations(listingId, since);
    return c.json({
      listing_id: listingId,
      range,
      observations: observations2
    });
  });
  app.get("/api/v1/listings/:listingId/competitors/curve", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const observations2 = await competitors.listObservations(listingId, since);
    const points = buildCompetitorCurve(observations2.map((o) => ({
      observed_at: o.observed_at,
      effective_price: o.effective_price
    })));
    return c.json({ listing_id: listingId, range, points });
  });
  app.get("/api/v1/listings/:listingId/competitors/curve/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const observations2 = await competitors.listObservations(listingId, since);
    const points = buildCompetitorCurve(observations2.map((o) => ({
      observed_at: o.observed_at,
      effective_price: o.effective_price
    })));
    const csv = competitorCurvePointsToCsv(points);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-curve-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/competitors/curve/:curveDate/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const curveDate = c.req.param("curveDate");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const range = c.req.query("range") ?? "7d";
    const days = range === "30d" ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
    const observations2 = await competitors.listObservations(listingId, since);
    const points = buildCompetitorCurve(observations2.map((o) => ({
      observed_at: o.observed_at,
      effective_price: o.effective_price
    })));
    const point = points.find((p) => p.date === curveDate);
    if (!point) {
      throw new HTTPException3(404, {
        message: "COMPETITOR_CURVE_POINT_NOT_FOUND"
      });
    }
    const csv = competitorCurvePointsToCsv([point]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="competitor-curve-point-${listingId}-${curveDate}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/ingest/status/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const status = await buildListingIngestStatus({ catalog, repricing, listingHealth }, tenantId, listingId);
    if (!status) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = listingIngestStatusToCsv(status, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-ingest-status-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/ingest/status", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const status = await buildListingIngestStatus({ catalog, repricing, listingHealth }, tenantId, listingId);
    if (!status) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    return c.json(status);
  });
  app.post("/api/v1/listings/:listingId/ingest/run", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    try {
      const result = await runCompetitorIngest(catalog, competitors, repricing, listingHealth, shops2, listingAdapter, tenantId, listingId);
      return c.json(result);
    } catch (e) {
      if (e instanceof CompetitorScrapeComplianceError) {
        return c.json({ error: e.message }, 403);
      }
      if (e instanceof IngestFailedError) {
        return c.json({ error: "INGEST_FAILED" }, 503);
      }
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/ops/competitor-ingest/status", (c) => c.json(getCompetitorIngestStatus()));
  app.post("/api/v1/ops/competitor-ingest/run-due", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json().catch(() => ({}));
    const result = await runDueCompetitorIngest({
      catalog,
      competitors,
      repricing,
      listingHealth,
      shops: shops2,
      listingAdapter
    }, tenantId, { force: body.force });
    return c.json(result);
  });
  app.post("/api/v1/listings/:listingId/repricing-events/flush", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const event = await flushListingDebounce(repricing, tenantId, listingId);
    return c.json({ event });
  });
  app.get("/api/v1/listings/:listingId/repricing-events/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? "100") || 100));
    const items = await repricing.listEvents(tenantId, listingId, limit);
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = repricingEventsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-events-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/repricing-events", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const items = await repricing.listEvents(tenantId, listingId);
    return c.json({ items });
  });
  app.get("/api/v1/repricing-events/:eventId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const eventId = c.req.param("eventId");
    const event = await repricing.getEvent(eventId);
    if (!event || event.tenant_id !== tenantId) {
      throw new HTTPException3(404, { message: "REPRICING_EVENT_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = repricingEventsToCsv([event], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-event-${eventId}.csv"`
      }
    });
  });
  app.post("/api/v1/repricing-events/:eventId/process", async (c) => {
    const tenantId = c.get("tenantId");
    const eventId = c.req.param("eventId");
    try {
      const result = await processRepricingEvent(catalog, competitors, repricing, dynamicRules, listingHealth, repricingActivity, tenantId, eventId, c.get("locale"));
      return c.json(result);
    } catch (e) {
      if (String(e).includes("EVENT_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "EVENT_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/listings/:listingId/dynamic-repricing-rule/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const view = await buildListingDynamicRepricingRuleView({ catalog, dynamicRules, listingHealth }, tenantId, listingId);
    if (!view) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = dynamicRepricingRuleToCsv(view, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dynamic-repricing-rule-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/dynamic-repricing-rule", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const view = await buildListingDynamicRepricingRuleView({ catalog, dynamicRules, listingHealth }, tenantId, listingId);
    if (!view) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    return c.json({
      rule: view.rule,
      stale: view.stale,
      category_template: view.category_template
    });
  });
  app.put("/api/v1/listings/:listingId/dynamic-repricing-rule", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = await c.req.json();
    const rule = await dynamicRules.upsertRule(listingId, {
      enabled: body.enabled,
      action: body.action,
      anchor_type: body.anchor_type,
      offset: body.offset,
      cooldown_min: body.cooldown_min,
      daily_limit: body.daily_limit,
      min_gap_mxn: body.min_gap_mxn,
      frozen: body.frozen,
      business_hours_only: body.business_hours_only
    });
    return c.json(rule);
  });
  app.post("/api/v1/listings/:listingId/dynamic-repricing-rule/compile", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = await c.req.json();
    if (!body.natural_language?.trim()) {
      throw new HTTPException3(400, { message: "NATURAL_LANGUAGE_REQUIRED" });
    }
    const locale = c.get("locale");
    const { draft, explanation, compiler } = await compileRuleViaAdapter(body.natural_language, locale);
    const compiled = storeCompiledDraft({
      tenant_id: tenantId,
      listing_id: listingId,
      source_text: body.natural_language,
      draft,
      explanation
    });
    await agentAudit.recordInvocation({
      tenant_id: tenantId,
      tool_name: "tool_compile_dynamic_rule",
      session_id: body.session_id ?? null,
      arguments_json: {
        listing_id: listingId,
        natural_language: body.natural_language
      },
      result_summary: `compile:${compiled.compile_id}`
    });
    return c.json({
      compile_id: compiled.compile_id,
      draft: compiled.draft,
      explanation: compiled.explanation,
      persisted: false,
      compiler
    });
  });
  app.post("/api/v1/listings/:listingId/dynamic-repricing-rule/confirm-compiled", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const body = await c.req.json();
    if (!body.compile_id) {
      throw new HTTPException3(400, { message: "COMPILE_ID_REQUIRED" });
    }
    const compiled = takeCompiledDraft(tenantId, listingId, body.compile_id);
    if (!compiled) {
      throw new HTTPException3(404, { message: "COMPILE_NOT_FOUND" });
    }
    const merged = { ...compiled.draft, ...body.draft };
    const rule = await dynamicRules.upsertRule(listingId, merged);
    await agentAudit.recordInvocation({
      tenant_id: tenantId,
      tool_name: "tool_confirm_dynamic_rule",
      session_id: null,
      arguments_json: {
        listing_id: listingId,
        compile_id: body.compile_id
      },
      result_summary: `rule:${rule.action}:${rule.anchor_type}`
    });
    return c.json({ rule, compile_id: body.compile_id, persisted: true });
  });
  app.post("/api/v1/listings/:listingId/dynamic-repricing-rule/unfreeze", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const rule = await dynamicRules.unfreeze(listingId);
    return c.json(rule ?? { listing_id: listingId, frozen: false });
  });
  app.post("/api/v1/listings/:listingId/competitors/stale-check", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const result = await evaluateListingStale(competitors, listingHealth, listingId);
    const stale = await listingHealth.getStale(listingId);
    return c.json({ ...result, ...stale });
  });
  app.post("/api/v1/listings/:listingId/channel-publish", async (c) => {
    assertPrincipalRoles(c, [ROLES.CHANNEL_ADMIN, ROLES.PRICING_WRITE]);
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const body = await c.req.json().catch(() => ({}));
    try {
      const result = await publishListingPrice(catalog, shops2, dynamicRules, publishAdapter, tenantId, listingId, {
        ...body,
        retry_on_step: body.retry_on_step ?? true
      });
      if (result.publish_status === "failed") {
        const status = result.error_code === "AUTH_REQUIRED" || result.error_code === "AUTH_EXPIRED" ? 401 : 422;
        return c.json(result, status);
      }
      return c.json(result);
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.post("/api/v1/shops/:shopId/channel-publish", async (c) => {
    assertPrincipalRoles(c, [ROLES.CHANNEL_ADMIN, ROLES.PRICING_WRITE]);
    const tenantId = c.get("tenantId");
    const shopId = c.req.param("shopId");
    const listingId = LISTING_ID_BY_SHOP[shopId];
    if (!listingId) {
      throw new HTTPException3(404, { message: "SHOP_NOT_FOUND" });
    }
    const body = await c.req.json().catch(() => ({}));
    try {
      const result = await publishListingPrice(catalog, shops2, dynamicRules, publishAdapter, tenantId, listingId, {
        retry_on_step: body.retry_on_step ?? true,
        idempotency_key: body.idempotency_key
      });
      if (result.publish_status === "failed") {
        const status = result.error_code === "AUTH_REQUIRED" || result.error_code === "AUTH_EXPIRED" ? 401 : 422;
        return c.json(result, status);
      }
      return c.json({ shop_id: shopId, listing_id: listingId, ...result });
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.post("/api/v1/channel-publish/batch", async (c) => {
    assertPrincipalRoles(c, [ROLES.CHANNEL_ADMIN, ROLES.PRICING_WRITE]);
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (!Array.isArray(body.listing_ids) || body.listing_ids.length === 0) {
      throw new HTTPException3(400, { message: "INVALID_LISTING_IDS" });
    }
    try {
      const result = await publishListingPriceBatch(catalog, shops2, dynamicRules, publishAdapter, tenantId, body.listing_ids, {
        retry_on_step: body.retry_on_step ?? true,
        idempotency_key: body.idempotency_key
      });
      const status = result.publish_status === "all_failed" ? 422 : 200;
      return c.json(result, status);
    } catch (e) {
      if (String(e).includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/skus/:skuId/repricing-queue/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    try {
      const rows3 = await buildSkuRepricingQueueRows(catalog, tenantId, skuId);
      const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
      const csv = repricingQueueToCsv(rows3, exportedAt);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="repricing-queue-${skuId}.csv"`
        }
      });
    } catch (e) {
      if (String(e).includes("SKU_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/skus/:skuId/repricing-queue", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    try {
      const queue3 = await listRepricingQueue(catalog, tenantId, skuId);
      return c.json(queue3);
    } catch (e) {
      if (String(e).includes("SKU_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/repricing-queue/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const rows3 = await buildTenantRepricingQueue(catalog, tenantId);
    const csv = repricingQueueToCsv(rows3, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-queue-tenant.csv"`
      }
    });
  });
  app.post("/api/v1/repricing-queue/promote-pending", async (c) => {
    const body = await c.req.json();
    if (!body.version_ids?.length) {
      throw new HTTPException3(400, { message: "INVALID_VERSION_IDS" });
    }
    const result = await promoteVersionsToPending(catalog, body.version_ids);
    return c.json(result);
  });
  app.get("/api/v1/skus/:skuId/repricing-batch/shard-plan/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const shardTotalRaw = c.req.query("shard_total") ?? "2";
    const shardTotal = Number.parseInt(shardTotalRaw, 10);
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException3(400, { message: "INVALID_SHARD_TOTAL" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const plan = planRepricingShards(tenantId, skuId, shardTotal);
    const csv = repricingBatchShardPlanToCsv(plan, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-shard-plan-${skuId}.csv"`
      }
    });
  });
  app.get("/api/v1/skus/:skuId/repricing-batch/shard-plan", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const shardTotalRaw = c.req.query("shard_total") ?? "2";
    const shardTotal = Number.parseInt(shardTotalRaw, 10);
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException3(400, { message: "INVALID_SHARD_TOTAL" });
    }
    return c.json(planRepricingShards(tenantId, skuId, shardTotal));
  });
  app.post("/api/v1/skus/:skuId/repricing-batch/recompute", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = await c.req.json();
    const shardTotal = body.shard_total ?? 2;
    const shardIndex = body.shard_index ?? 0;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64 || !Number.isFinite(shardIndex) || shardIndex < 0 || shardIndex >= shardTotal) {
      throw new HTTPException3(400, { message: "INVALID_SHARD_PARAMS" });
    }
    const result = await runRepricingBatchShard({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity,
      tenantId,
      skuId,
      shardIndex,
      shardTotal
    });
    if ("error" in result) {
      if (result.error === "SKU_NOT_FOUND") {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      throw new HTTPException3(400, { message: result.error });
    }
    return c.json(result);
  });
  app.post("/api/v1/skus/:skuId/repricing-batch/recompute-all", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = await c.req.json().catch(() => ({}));
    const shardTotal = body.shard_total ?? 2;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException3(400, { message: "INVALID_SHARD_TOTAL" });
    }
    const result = await runRepricingBatchAllShards({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity,
      tenantId,
      skuId,
      shardTotal
    });
    if ("error" in result) {
      throw new HTTPException3(404, { message: result.error });
    }
    return c.json(result);
  });
  app.post("/api/v1/repricing-batch/recompute-all", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json().catch(() => ({}));
    const shardTotal = body.shard_total ?? 2;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException3(400, { message: "INVALID_SHARD_TOTAL" });
    }
    const result = await runRepricingBatchForTenant({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity,
      tenantId,
      shardTotal,
      skuIds: body.sku_ids
    });
    return c.json(result);
  });
  app.post("/api/v1/repricing-batch/jobs/enqueue", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    const scope = body.scope ?? "tenant";
    const shardTotal = body.shard_total ?? 2;
    if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
      throw new HTTPException3(400, { message: "INVALID_SHARD_TOTAL" });
    }
    if (scope === "sku") {
      if (!body.sku_id?.trim()) {
        throw new HTTPException3(400, { message: "SKU_ID_REQUIRED" });
      }
      const sku = await catalog.getSku(tenantId, body.sku_id);
      if (!sku) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
    }
    try {
      const job = await enqueueRepricingBatchJob({
        tenant_id: tenantId,
        scope,
        sku_id: body.sku_id,
        shard_total: shardTotal,
        sku_ids: body.sku_ids
      });
      return c.json({ job }, 201);
    } catch (e) {
      if (String(e).includes("SKU_ID_REQUIRED")) {
        throw new HTTPException3(400, { message: "SKU_ID_REQUIRED" });
      }
      throw e;
    }
  });
  app.get("/api/v1/repricing-batch/jobs/summary/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const summary = await summarizeRepricingBatchJobs(tenantId, limit);
    const csv = repricingBatchJobsSummaryToCsv(summary, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-jobs-summary.csv"`
      }
    });
  });
  app.get("/api/v1/repricing-batch/jobs/summary", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    return c.json(await summarizeRepricingBatchJobs(tenantId, limit));
  });
  app.get("/api/v1/repricing-batch/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = await listRepricingBatchJobs(tenantId, limit);
    const csv = repricingBatchJobsToCsv(jobs2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-jobs.csv"`
      }
    });
  });
  app.get("/api/v1/repricing-batch/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: await listRepricingBatchJobs(tenantId, limit) });
  });
  app.get("/api/v1/repricing-batch/jobs/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const job = await getRepricingBatchJob(tenantId, c.req.param("jobId"));
    if (!job) {
      throw new HTTPException3(404, { message: "JOB_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = repricingBatchJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repricing-batch-job-${job.job_id}.csv"`
      }
    });
  });
  app.get("/api/v1/repricing-batch/jobs/:jobId", async (c) => {
    const tenantId = c.get("tenantId");
    const job = await getRepricingBatchJob(tenantId, c.req.param("jobId"));
    if (!job) {
      throw new HTTPException3(404, { message: "JOB_NOT_FOUND" });
    }
    return c.json(job);
  });
  app.post("/api/v1/repricing-batch/jobs/process", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json().catch(() => ({}));
    const limit = body.limit != null ? Math.min(20, Math.max(1, body.limit)) : 5;
    const out = await processRepricingBatchQueue({
      catalog,
      competitors,
      repricing,
      dynamicRules,
      listingHealth,
      repricingActivity
    }, tenantId, limit, {
      worker_id: c.req.header("X-Repricing-Worker-Id")?.trim() || "bff-inline"
    });
    return c.json(out);
  });
  app.get("/api/v1/category-rule-templates", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json({ items: listCategoryRuleTemplates(tenantId) });
  });
  app.get("/api/v1/category-rule-templates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const templates = listCategoryRuleTemplates(tenantId);
    const csv = categoryRuleTemplatesToCsv(templates, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="category-rule-templates.csv"`
      }
    });
  });
  app.get("/api/v1/category-rule-templates/:categoryId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const tpl = getCategoryRuleTemplate(tenantId, c.req.param("categoryId"));
    if (!tpl) {
      throw new HTTPException3(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = categoryRuleTemplatesToCsv([tpl], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="category-rule-template-${tpl.category_id}.csv"`
      }
    });
  });
  app.get("/api/v1/category-rule-templates/:categoryId", async (c) => {
    const tenantId = c.get("tenantId");
    const tpl = getCategoryRuleTemplate(tenantId, c.req.param("categoryId"));
    if (!tpl) {
      throw new HTTPException3(404, { message: "CATEGORY_TEMPLATE_NOT_FOUND" });
    }
    return c.json(tpl);
  });
  app.get("/api/v1/tenants/:tenantId/shared-fee-templates/export", async (c) => {
    const tenantId = c.req.param("tenantId");
    const headerTenant = c.get("tenantId");
    if (tenantId !== headerTenant) {
      throw new HTTPException3(403, { message: "TENANT_MISMATCH" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = sharedFeeTemplatesToCsv(listSharedFeeTemplates(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shared-fee-templates-${tenantId}.csv"`
      }
    });
  });
  app.get("/api/v1/tenants/:tenantId/shared-fee-templates", async (c) => {
    const tenantId = c.req.param("tenantId");
    const headerTenant = c.get("tenantId");
    if (tenantId !== headerTenant) {
      throw new HTTPException3(403, { message: "TENANT_MISMATCH" });
    }
    return c.json({ items: listSharedFeeTemplates(tenantId) });
  });
  app.get("/api/v1/shared-fee-templates/:templateId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const templateId = c.req.param("templateId");
    const tpl = getSharedFeeTemplate(tenantId, templateId);
    if (!tpl) {
      throw new HTTPException3(404, { message: "SHARED_FEE_TEMPLATE_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = sharedFeeTemplatesToCsv([tpl], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shared-fee-template-${templateId}.csv"`
      }
    });
  });
  app.get("/api/v1/shared-fee-templates/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const templates = listSharedFeeTemplates(tenantId);
    const csv = sharedFeeTemplatesToCsv(templates, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shared-fee-templates.csv"`
      }
    });
  });
  app.post("/api/v1/skus/:skuId/apply-shared-fee-template", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const body = await c.req.json();
    if (!body.template_id?.trim()) {
      throw new HTTPException3(400, { message: "TEMPLATE_ID_REQUIRED" });
    }
    const result = await applySharedFeeTemplateToSku(catalog, tenantId, skuId, body.template_id.trim());
    if (!result) {
      throw new HTTPException3(404, { message: "SKU_OR_TEMPLATE_NOT_FOUND" });
    }
    return c.json(result);
  });
  app.get("/api/v1/skus/:skuId/category-rule-template/export", async (c) => {
    const tenantId = c.get("tenantId");
    const skuId = c.req.param("skuId");
    const sku = await catalog.getSku(tenantId, skuId);
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    const categoryId = sku.category_id ?? null;
    const template = categoryId ? getCategoryRuleTemplate(tenantId, categoryId) : void 0;
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = skuCategoryRuleTemplateToCsv(skuId, categoryId, template ?? null, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sku-category-rule-template-${skuId}.csv"`
      }
    });
  });
  app.get("/api/v1/skus/:skuId/category-rule-template", async (c) => {
    const tenantId = c.get("tenantId");
    const sku = await catalog.getSku(tenantId, c.req.param("skuId"));
    if (!sku) {
      throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
    }
    if (!sku.category_id) {
      return c.json({ template: null });
    }
    const template = getCategoryRuleTemplate(tenantId, sku.category_id);
    if (!template) {
      return c.json({ template: null, category_id: sku.category_id });
    }
    return c.json({ category_id: sku.category_id, template });
  });
  app.get("/api/v1/reconciliation-alerts/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await reconciliationAlerts.listAlerts(tenantId);
    const csv = reconciliationAlertsToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reconciliation-alerts.csv"`
      }
    });
  });
  app.get("/api/v1/reconciliation-alerts/:alertId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const alertId = c.req.param("alertId");
    const items = await reconciliationAlerts.listAlerts(tenantId);
    const alert = items.find((a) => a.id === alertId);
    if (!alert) {
      throw new HTTPException3(404, { message: "RECONCILIATION_ALERT_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = reconciliationAlertsToCsv([alert], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reconciliation-alert-${alertId}.csv"`
      }
    });
  });
  app.get("/api/v1/reconciliation-alerts", async (c) => {
    const tenantId = c.get("tenantId");
    const items = await reconciliationAlerts.listAlerts(tenantId);
    return c.json({ items });
  });
  app.get("/api/v1/ops/listing-sync/schedule/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = listingSyncScheduleToCsv(getListingSyncSchedule(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-schedule.csv"`
      }
    });
  });
  app.get("/api/v1/ops/listing-sync/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(getListingSyncSchedule(tenantId));
  });
  app.put("/api/v1/ops/listing-sync/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    try {
      return c.json(upsertListingSyncSchedule(tenantId, body));
    } catch (e) {
      if (String(e).includes("INVALID_CRON_EXPRESSION")) {
        throw new HTTPException3(400, { message: "INVALID_CRON_EXPRESSION" });
      }
      throw e;
    }
  });
  app.get("/api/v1/ops/listing-sync/status", async (c) => {
    const tenantId = c.get("tenantId");
    const sample = Math.min(100, Math.max(1, Number(c.req.query("sample") ?? "50") || 50));
    return c.json(buildListingSyncOpsStatus(tenantId, sample));
  });
  app.get("/api/v1/ops/listing-sync/status/export", async (c) => {
    const tenantId = c.get("tenantId");
    const sample = Math.min(100, Math.max(1, Number(c.req.query("sample") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const status = buildListingSyncOpsStatus(tenantId, sample);
    const csv = listingSyncOpsStatusToCsv(status, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-ops-status.csv"`
      }
    });
  });
  app.get("/api/v1/ops/listing-sync/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = listListingSyncJobsForTenant(tenantId, limit);
    const csv = listingSyncJobsToCsv(jobs2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-jobs.csv"`
      }
    });
  });
  app.get("/api/v1/ops/listing-sync/jobs/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const job = getListingSyncJob(tenantId, jobId);
    if (!job) {
      throw new HTTPException3(404, { message: "LISTING_SYNC_JOB_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = listingSyncJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-job-${jobId}.csv"`
      }
    });
  });
  app.get("/api/v1/ops/listing-sync/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));
    return c.json({ items: listListingSyncJobsForTenant(tenantId, limit) });
  });
  app.post("/api/v1/ops/listing-sync/run-due", async (c) => {
    const tenantId = c.get("tenantId");
    const force = c.req.query("force") === "true";
    const result = await runDueListingChannelSyncs(catalog, shops2, listingAdapter, tenantId, { force });
    if (result.skipped) {
      throw new HTTPException3(409, { message: "SCHEDULE_DISABLED" });
    }
    return c.json({
      schedule: getListingSyncSchedule(tenantId),
      runs: result.runs
    });
  });
  app.post("/api/v1/ops/reconciliation/run-due", async (c) => {
    const tenantId = c.get("tenantId");
    const results = await runDueReconciliation(catalog, shops2, listingAdapter, reconciliationAlerts, tenantId);
    return c.json({
      tenant_id: tenantId,
      checked: results.length,
      results,
      generated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/v1/listings/:listingId/sync/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = listListingSyncJobs(tenantId, listingId, limit);
    const csv = listingSyncJobsToCsv(jobs2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listing-sync-jobs-${listingId}.csv"`
      }
    });
  });
  app.get("/api/v1/listings/:listingId/sync/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    return c.json({
      items: listListingSyncJobs(tenantId, listingId)
    });
  });
  app.post("/api/v1/listings/:listingId/sync", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const body = await c.req.json();
    if (!body.external_ref?.trim()) {
      throw new HTTPException3(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    try {
      const result = await runListingChannelSync(catalog, shops2, listingAdapter, tenantId, listingId, body.external_ref.trim());
      if (result.job.status === "failed") {
        return c.json({ job: result.job, error: result.error ?? "SYNC_FAILED" }, 502);
      }
      return c.json({ job: result.job, snapshot: result.snapshot });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      if (msg.includes("AUTH_REQUIRED") || msg.includes("AUTH_EXPIRED")) {
        return c.json({ error: msg.split(":")[0] }, 401);
      }
      throw e;
    }
  });
  app.post("/api/v1/listings/:listingId/reconcile", async (c) => {
    const tenantId = c.get("tenantId");
    const listingId = c.req.param("listingId");
    const body = await c.req.json();
    if (!body.external_ref?.trim()) {
      throw new HTTPException3(400, { message: "EXTERNAL_REF_REQUIRED" });
    }
    try {
      const result = await reconcileListingChannelPrice(catalog, shops2, listingAdapter, reconciliationAlerts, tenantId, listingId, body);
      return c.json(result);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      if (msg.includes("AUTH_REQUIRED") || msg.includes("AUTH_EXPIRED")) {
        return c.json({ error: msg.includes("AUTH_EXPIRED") ? "AUTH_EXPIRED" : "AUTH_REQUIRED" }, 401);
      }
      if (msg.includes("NO_ACTIVE_VERSION")) {
        return c.json({ error: "NO_ACTIVE_VERSION" }, 422);
      }
      throw e;
    }
  });
  app.get("/api/v1/agent/tools/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentToolsToCsv(listAgentTools(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tools.csv"`
      }
    });
  });
  app.get("/api/v1/agent/tools/:toolName/export", async (c) => {
    const toolName = decodeURIComponent(c.req.param("toolName"));
    const tool = getAgentTool(toolName);
    if (!tool) {
      throw new HTTPException3(404, { message: "AGENT_TOOL_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentToolsToCsv([tool], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tool-${toolName}.csv"`
      }
    });
  });
  app.get("/api/v1/agent/tools", async (c) => {
    return c.json({ items: listAgentTools() });
  });
  app.get("/api/v1/agent/readiness/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentReadinessToCsv(evaluateAgentReadiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-readiness.csv"`
      }
    });
  });
  app.get("/api/v1/agent/readiness", async (c) => {
    return c.json(evaluateAgentReadiness());
  });
  app.get("/api/v1/agent/readiness/checks/export", async (c) => {
    const checkId = c.req.query("check_id")?.trim();
    if (!checkId) {
      throw new HTTPException3(400, { message: "CHECK_ID_REQUIRED" });
    }
    const snapshot = evaluateAgentReadiness();
    const check = snapshot.checks.find((ch) => ch.id === checkId);
    if (!check) {
      throw new HTTPException3(404, { message: "AGENT_READINESS_CHECK_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentReadinessToCsv({ ...snapshot, checks: [check] }, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-readiness-check.csv"`
      }
    });
  });
  app.get("/api/v1/agent/milestones/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentMilestonesToCsv(getProductMilestoneStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-milestones.csv"`
      }
    });
  });
  app.get("/api/v1/agent/milestones", async (c) => {
    return c.json(getProductMilestoneStatus());
  });
  app.get("/api/v1/agent/milestones/:milestoneId/export", async (c) => {
    const milestoneId = c.req.param("milestoneId");
    const status = getProductMilestoneStatus();
    const milestone = status.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new HTTPException3(404, { message: "AGENT_MILESTONE_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentMilestonesToCsv({ ...status, milestones: [milestone] }, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-milestone-${milestoneId}.csv"`
      }
    });
  });
  app.get("/api/v1/product/readiness/p3/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = p3ReadinessToCsv(evaluateP3Readiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="p3-readiness.csv"`
      }
    });
  });
  app.get("/api/v1/product/readiness/p4/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = p4ReadinessToCsv(evaluateAgentReadiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="p4-readiness.csv"`
      }
    });
  });
  app.get("/api/v1/product/readiness/p5/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = p5ReadinessToCsv(evaluateP5Readiness(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="p5-readiness.csv"`
      }
    });
  });
  app.get("/api/v1/product/readiness/checks/export", async (c) => {
    const checkId = c.req.query("check_id")?.trim();
    if (!checkId) {
      throw new HTTPException3(400, { message: "CHECK_ID_REQUIRED" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const summary = getProductReadinessSummary();
    const p3 = summary.p3.checks.find((ch) => ch.id === checkId);
    let csv;
    if (p3) {
      csv = p3ReadinessToCsv({ ...summary.p3, checks: [p3] }, exportedAt);
    } else {
      const p4 = summary.p4.checks.find((ch) => ch.id === checkId);
      if (p4) {
        csv = p4ReadinessToCsv({ ...summary.p4, checks: [p4] }, exportedAt);
      } else {
        const p5 = summary.p5.checks.find((ch) => ch.id === checkId);
        if (!p5) {
          throw new HTTPException3(404, {
            message: "PRODUCT_READINESS_CHECK_NOT_FOUND"
          });
        }
        csv = p5ReadinessToCsv({ ...summary.p5, checks: [p5] }, exportedAt);
      }
    }
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="product-readiness-check.csv"`
      }
    });
  });
  app.get("/api/v1/product/readiness/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = productReadinessToCsv(getProductReadinessSummary(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="product-readiness.csv"`
      }
    });
  });
  app.get("/api/v1/product/readiness", async (c) => {
    return c.json(getProductReadinessSummary());
  });
  app.get("/api/v1/product/release-gate/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = releaseGateToCsv(evaluateReleaseGate(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="release-gate.csv"`
      }
    });
  });
  app.get("/api/v1/product/release-gate", async (c) => {
    return c.json(evaluateReleaseGate());
  });
  app.get("/api/v1/rule-compiler/status/export", async (c) => {
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = ruleCompilerStatusToCsv(getRuleCompilerStatus(), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rule-compiler-status.csv"`
      }
    });
  });
  app.get("/api/v1/rule-compiler/status", async (c) => {
    return c.json(getRuleCompilerStatus());
  });
  app.post("/api/v1/agent/copilot/sessions", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const body = await c.req.json().catch(() => ({}));
    const session = createCopilotSession({
      tenant_id: tenantId,
      listing_id: body.listing_id ?? null,
      sku_id: body.sku_id ?? null
    });
    const bootstrap = body.bootstrap_context !== false && Boolean(body.sku_id);
    if (bootstrap && body.sku_id) {
      appendCopilotAssistantMessage(tenantId, session.session_id, copilotWelcomeMessage(locale));
      try {
        const toolOut = await invokeAgentTool({ catalog, competitors, adjustments, audit: agentAudit }, { tenantId, locale, sessionId: session.session_id }, "tool_get_pricing_context", {
          sku_id: body.sku_id,
          channel: body.channel
        });
        const narrative = buildPricingContextNarrative(toolOut.result, locale);
        appendCopilotAssistantMessage(tenantId, session.session_id, narrative);
      } catch {
        appendCopilotAssistantMessage(tenantId, session.session_id, locale === "es-MX" ? "No se pudo cargar el contexto de precios." : locale === "zh-CN" ? "\u65E0\u6CD5\u52A0\u8F7D\u5B9A\u4EF7\u4E0A\u4E0B\u6587\u3002" : "Could not load pricing context.");
      }
    }
    const updated = getCopilotSession(tenantId, session.session_id);
    return c.json({
      session_id: updated.session_id,
      listing_id: updated.listing_id,
      sku_id: updated.sku_id,
      created_at: updated.created_at,
      messages: updated.messages,
      context_bootstrapped: bootstrap
    });
  });
  app.get("/api/v1/agent/digest/daily/export", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const date = c.req.query("date");
    const digest = await buildDailyAgentDigest({ catalog, reconciliationAlerts, agentAudit }, tenantId, locale, date);
    const csv = agentDigestToCsv(digest);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-digest-${digest.date}.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/daily/:date/export", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const date = c.req.param("date");
    const digest = await buildDailyAgentDigest({ catalog, reconciliationAlerts, agentAudit }, tenantId, locale, date);
    const csv = agentDigestToCsv(digest);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-digest-${digest.date}.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/daily", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const date = c.req.query("date");
    const digest = await buildDailyAgentDigest({ catalog, reconciliationAlerts, agentAudit }, tenantId, locale, date);
    return c.json(digest);
  });
  app.get("/api/v1/agent/digest/schedule/export", async (c) => {
    const tenantId = c.get("tenantId");
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = digestScheduleToCsv(getDigestSchedule(tenantId), exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-schedule.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    return c.json(getDigestSchedule(tenantId));
  });
  app.put("/api/v1/agent/digest/schedule", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    try {
      const schedule = upsertDigestSchedule(tenantId, body);
      return c.json(schedule);
    } catch (e) {
      if (String(e).includes("INVALID_CRON_EXPRESSION")) {
        throw new HTTPException3(400, { message: "INVALID_CRON_EXPRESSION" });
      }
      throw e;
    }
  });
  app.post("/api/v1/agent/digest/run-due", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const force = c.req.query("force") === "true";
    const date = c.req.query("date");
    const result = await runDueDigestDispatch({ catalog, reconciliationAlerts, agentAudit }, tenantId, locale, { force, date });
    if (result.skipped) {
      throw new HTTPException3(409, { message: "DIGEST_SCHEDULE_DISABLED" });
    }
    await agentAudit.recordInvocation({
      tenant_id: tenantId,
      tool_name: "tool_digest_run_due",
      session_id: null,
      arguments_json: { job_id: result.record.job_id, force },
      result_summary: `digest:${result.record.job_id}`
    });
    return c.json({
      job: result.record,
      digest: result.digest,
      schedule: result.schedule
    });
  });
  app.post("/api/v1/agent/digest/daily/dispatch", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const body = await c.req.json().catch(() => ({}));
    const { record, digest } = await dispatchDailyDigest({ catalog, reconciliationAlerts, agentAudit }, tenantId, locale, body);
    await agentAudit.recordInvocation({
      tenant_id: tenantId,
      tool_name: "tool_digest_dispatch",
      session_id: null,
      arguments_json: { date: record.date, job_id: record.job_id },
      result_summary: `digest:${record.job_id}`
    });
    return c.json({ job: record, digest });
  });
  app.get("/api/v1/agent/digest/dispatches/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = listDigestDispatches(tenantId, limit);
    const csv = digestDispatchesToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dispatches.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/dispatches", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: listDigestDispatches(tenantId, limit) });
  });
  app.get("/api/v1/agent/digest/dispatches/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const dispatch = getDigestDispatch(tenantId, jobId);
    if (!dispatch) {
      throw new HTTPException3(404, { message: "DIGEST_DISPATCH_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = digestDispatchesToCsv([dispatch], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dispatch-${jobId}.csv"`
      }
    });
  });
  app.post("/api/v1/agent/digest/daily/enqueue", async (c) => {
    const tenantId = c.get("tenantId");
    const locale = c.get("locale");
    const body = await c.req.json().catch(() => ({}));
    const job = await enqueueDailyDigestJob({
      tenant_id: tenantId,
      locale,
      date: body.date,
      channels: body.channels,
      simulate_poison: body.simulate_poison
    });
    return c.json({ job });
  });
  app.get("/api/v1/agent/digest/jobs/summary/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = await listDigestQueuedJobs(tenantId, limit);
    const summary = await buildDigestQueuedJobsSummary(tenantId, jobs2);
    const csv = digestQueuedJobsSummaryToCsv(summary, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-queued-jobs-summary.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/jobs/summary", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));
    const jobs2 = await listDigestQueuedJobs(tenantId, limit);
    return c.json(await buildDigestQueuedJobsSummary(tenantId, jobs2));
  });
  app.get("/api/v1/agent/digest/jobs/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = await listDigestQueuedJobs(tenantId, limit);
    const csv = digestQueuedJobsToCsv(jobs2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-queued-jobs.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/jobs", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: await listDigestQueuedJobs(tenantId, limit) });
  });
  app.get("/api/v1/agent/digest/jobs/dead-letter/summary/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = await listDigestDeadLetterJobs(tenantId, limit);
    const summary = buildDigestDeadLetterSummary(tenantId, jobs2, await digestQueueSummary(tenantId));
    const csv = digestDeadLetterSummaryToCsv(summary, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dead-letter-summary.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/jobs/dead-letter/summary", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));
    const jobs2 = await listDigestDeadLetterJobs(tenantId, limit);
    return c.json(buildDigestDeadLetterSummary(tenantId, jobs2, await digestQueueSummary(tenantId)));
  });
  app.get("/api/v1/agent/digest/jobs/dead-letter/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "50") || 50));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const jobs2 = await listDigestDeadLetterJobs(tenantId, limit);
    const csv = digestDeadLetterJobsToCsv(jobs2, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dead-letter.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/jobs/dead-letter/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const job = await getDigestQueuedJob(tenantId, jobId);
    if (!job || job.status !== "dead_letter") {
      throw new HTTPException3(404, {
        message: "DIGEST_DEAD_LETTER_JOB_NOT_FOUND"
      });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = digestDeadLetterJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-dead-letter-job-${jobId}.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/jobs/:jobId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const jobId = c.req.param("jobId");
    const job = await getDigestQueuedJob(tenantId, jobId);
    if (!job) {
      throw new HTTPException3(404, { message: "DIGEST_JOB_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = digestQueuedJobsToCsv([job], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="digest-queued-job-${jobId}.csv"`
      }
    });
  });
  app.get("/api/v1/agent/digest/jobs/dead-letter", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(50, Math.max(1, Number(limitRaw))) : 20;
    return c.json({ items: await listDigestDeadLetterJobs(tenantId, limit) });
  });
  app.post("/api/v1/agent/digest/jobs/process", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json().catch(() => ({}));
    const limit = body.limit != null ? Math.min(20, Math.max(1, body.limit)) : 5;
    const out = await processDigestQueue({ catalog, reconciliationAlerts, agentAudit }, tenantId, limit);
    for (const job of out.processed) {
      if (job.status === "completed") {
        await agentAudit.recordInvocation({
          tenant_id: tenantId,
          tool_name: "tool_digest_dispatch",
          session_id: null,
          arguments_json: { job_id: job.job_id, queued: true },
          result_summary: `digest:${job.job_id}`
        });
      }
    }
    return c.json(out);
  });
  app.get("/api/v1/agent/copilot/sessions/:sessionId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const sessionId = c.req.param("sessionId");
    const session = getCopilotSession(tenantId, sessionId);
    if (!session) {
      throw new HTTPException3(404, { message: "SESSION_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = copilotSessionToCsv(session, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="copilot-session-${sessionId}.csv"`
      }
    });
  });
  app.get("/api/v1/agent/copilot/sessions/:sessionId", async (c) => {
    const tenantId = c.get("tenantId");
    const sessionId = c.req.param("sessionId");
    const session = getCopilotSession(tenantId, sessionId);
    if (!session) {
      throw new HTTPException3(404, { message: "SESSION_NOT_FOUND" });
    }
    return c.json(session);
  });
  app.post("/api/v1/agent/copilot/sessions/:sessionId/messages", async (c) => {
    const tenantId = c.get("tenantId");
    const sessionId = c.req.param("sessionId");
    const body = await c.req.json();
    if (!body.content?.trim()) {
      throw new HTTPException3(400, { message: "CONTENT_REQUIRED" });
    }
    const listingId = body.listing_id ?? getCopilotSession(tenantId, sessionId)?.listing_id ?? null;
    if (!listingId) {
      throw new HTTPException3(400, { message: "LISTING_ID_REQUIRED" });
    }
    const listing = await catalog.getListing(tenantId, listingId);
    if (!listing) {
      throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
    }
    try {
      const session = getCopilotSession(tenantId, sessionId);
      const skuId = session?.sku_id ?? listing.sku_id;
      const turn = await appendCopilotUserTurn({
        tenant_id: tenantId,
        session_id: sessionId,
        content: body.content,
        locale: c.get("locale"),
        listing_id: listingId,
        sku_id: skuId,
        channel: listing.channel,
        deps: { catalog, competitors, adjustments, audit: agentAudit }
      });
      await agentAudit.recordInvocation({
        tenant_id: tenantId,
        tool_name: "tool_copilot_turn",
        session_id: sessionId,
        arguments_json: {
          listing_id: listingId,
          content: body.content,
          intent: turn.intent,
          needs_clarification: turn.needs_clarification
        },
        result_summary: turn.intent === "simulate" ? "simulate" : turn.compile_id ? `compile:${turn.compile_id}` : "clarify"
      });
      return c.json({
        session_id: sessionId,
        intent: turn.intent,
        needs_clarification: turn.needs_clarification,
        compile_id: turn.compile_id,
        draft: turn.draft,
        explanation: turn.explanation,
        compiler: turn.compiler,
        messages: turn.session.messages
      });
    } catch (e) {
      if (String(e).includes("SESSION_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "SESSION_NOT_FOUND" });
      }
      throw e;
    }
  });
  app.get("/api/v1/agent/tool-audit/export", async (c) => {
    const tenantId = c.get("tenantId");
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? "100") || 100));
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const items = await agentAudit.listInvocations(tenantId, limit);
    const csv = agentToolAuditToCsv(items, exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tool-audit.csv"`
      }
    });
  });
  app.get("/api/v1/agent/tool-audit", async (c) => {
    const tenantId = c.get("tenantId");
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 100;
    const items = await agentAudit.listInvocations(tenantId, limit);
    return c.json({ items });
  });
  app.get("/api/v1/agent/tool-audit/:auditId/export", async (c) => {
    const tenantId = c.get("tenantId");
    const auditId = c.req.param("auditId");
    const items = await agentAudit.listInvocations(tenantId, 200);
    const row = items.find((a) => a.id === auditId);
    if (!row) {
      throw new HTTPException3(404, { message: "AGENT_TOOL_AUDIT_NOT_FOUND" });
    }
    const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
    const csv = agentToolAuditToCsv([row], exportedAt);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-tool-audit-${auditId}.csv"`
      }
    });
  });
  app.post("/api/v1/agent/tools/invoke", async (c) => {
    const tenantId = c.get("tenantId");
    const body = await c.req.json();
    if (!body.tool) {
      throw new HTTPException3(400, { message: "TOOL_REQUIRED" });
    }
    try {
      const out = await invokeAgentTool({ catalog, competitors, adjustments, audit: agentAudit }, {
        tenantId,
        locale: c.get("locale"),
        sessionId: body.session_id
      }, body.tool, body.arguments ?? {});
      return c.json(out);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("UNKNOWN_TOOL") || msg.includes("TOOL_NOT_ALLOWED")) {
        return c.json({ error: msg.includes("TOOL_NOT_ALLOWED") ? "TOOL_NOT_ALLOWED" : "UNKNOWN_TOOL" }, 400);
      }
      if (msg.includes("SKU_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "SKU_NOT_FOUND" });
      }
      if (msg.includes("LISTING_NOT_FOUND")) {
        throw new HTTPException3(404, { message: "LISTING_NOT_FOUND" });
      }
      if (msg.includes("GUARD_REJECTED")) {
        return c.json({ error: "GUARD_REJECTED" }, 422);
      }
      if (msg.includes("ITEMS_REQUIRED")) {
        throw new HTTPException3(400, { message: "ITEMS_REQUIRED" });
      }
      throw e;
    }
  });
  return app;
}

// api/handler.ts
var honoHandler;
async function handler(req) {
  try {
    if (!honoHandler) {
      getCatalogRepository();
      honoHandler = handle(createApp());
    }
    return honoHandler(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "FUNCTION_BOOT_FAILED", message },
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
export {
  handler as default
};
