import pg from "pg";
import type {
  CompetitorOfferRecord,
  CompetitorRepository,
  PriceObservationRecord,
} from "./competitor-types.js";
import type { SalesChannel } from "@mx-pricing/channel-adapters";

function mapOffer(row: Record<string, unknown>): CompetitorOfferRecord {
  return {
    id: row.id as string,
    listing_id: row.listing_id as string,
    channel: row.channel as SalesChannel,
    external_ref: row.external_ref as string,
    seller_id: (row.seller_id as string) ?? null,
    label: (row.label as string) ?? null,
    is_primary: Boolean(row.is_primary),
    created_at: new Date(row.created_at as string).toISOString(),
  };
}

function mapObs(row: Record<string, unknown>): PriceObservationRecord {
  const raw = row.raw_json;
  let raw_json: Record<string, unknown> | null = null;
  if (raw != null) {
    raw_json =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);
  }
  return {
    id: row.id as string,
    offer_id: row.offer_id as string,
    observed_at: new Date(row.observed_at as string).toISOString(),
    list_price: row.list_price != null ? Number(row.list_price) : null,
    sale_price: row.sale_price != null ? Number(row.sale_price) : null,
    shipping_addon: Number(row.shipping_addon),
    effective_price: Number(row.effective_price),
    currency: row.currency as string,
    raw_json,
  };
}

export class PostgresCompetitorRepository implements CompetitorRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async listOffers(listingId: string): Promise<CompetitorOfferRecord[]> {
    const res = await this.pool.query(
      `SELECT id, listing_id, channel, external_ref, seller_id, label, is_primary, created_at
       FROM competitor_offers WHERE listing_id = $1 ORDER BY created_at`,
      [listingId]
    );
    return res.rows.map(mapOffer);
  }

  async getOffer(offerId: string): Promise<CompetitorOfferRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, listing_id, channel, external_ref, seller_id, label, is_primary, created_at
       FROM competitor_offers WHERE id = $1`,
      [offerId]
    );
    if (!res.rowCount) return undefined;
    return mapOffer(res.rows[0]);
  }

  async createOffer(input: {
    listing_id: string;
    channel: SalesChannel;
    external_ref: string;
    seller_id?: string;
    label?: string;
    is_primary?: boolean;
  }): Promise<CompetitorOfferRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (input.is_primary) {
        await client.query(
          `UPDATE competitor_offers SET is_primary = FALSE WHERE listing_id = $1`,
          [input.listing_id]
        );
      }
      const id = `coff-${Date.now()}`;
      const res = await client.query(
        `INSERT INTO competitor_offers
         (id, listing_id, channel, external_ref, seller_id, label, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, listing_id, channel, external_ref, seller_id, label, is_primary, created_at`,
        [
          id,
          input.listing_id,
          input.channel,
          input.external_ref,
          input.seller_id ?? null,
          input.label ?? null,
          input.is_primary ?? false,
        ]
      );
      await client.query("COMMIT");
      return mapOffer(res.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async addObservation(input: {
    offer_id: string;
    observed_at: string;
    list_price?: number | null;
    sale_price?: number | null;
    shipping_addon?: number;
    effective_price: number;
    currency?: string;
    raw_json?: Record<string, unknown>;
  }): Promise<PriceObservationRecord> {
    const id = `obs-${Date.now()}`;
    const res = await this.pool.query(
      `INSERT INTO price_observations
       (id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json`,
      [
        id,
        input.offer_id,
        input.observed_at,
        input.list_price ?? null,
        input.sale_price ?? null,
        input.shipping_addon ?? 0,
        input.effective_price,
        input.currency ?? "MXN",
        input.raw_json ? JSON.stringify(input.raw_json) : null,
      ]
    );
    return mapObs(res.rows[0]);
  }

  async latestObservation(
    offerId: string
  ): Promise<PriceObservationRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json
       FROM price_observations WHERE offer_id = $1
       ORDER BY observed_at DESC LIMIT 1`,
      [offerId]
    );
    if (!res.rowCount) return undefined;
    return mapObs(res.rows[0]);
  }

  async listObservations(
    listingId: string,
    since: Date
  ): Promise<PriceObservationRecord[]> {
    const res = await this.pool.query(
      `SELECT o.id, o.offer_id, o.observed_at, o.list_price, o.sale_price,
              o.shipping_addon, o.effective_price, o.currency, o.raw_json
       FROM price_observations o
       JOIN competitor_offers c ON c.id = o.offer_id
       WHERE c.listing_id = $1 AND o.observed_at >= $2
       ORDER BY o.observed_at DESC`,
      [listingId, since.toISOString()]
    );
    return res.rows.map(mapObs);
  }

  async getObservation(
    observationId: string
  ): Promise<PriceObservationRecord | undefined> {
    const res = await this.pool.query(
      `SELECT id, offer_id, observed_at, list_price, sale_price, shipping_addon, effective_price, currency, raw_json
       FROM price_observations WHERE id = $1`,
      [observationId]
    );
    if (!res.rowCount) return undefined;
    return mapObs(res.rows[0]);
  }
}
