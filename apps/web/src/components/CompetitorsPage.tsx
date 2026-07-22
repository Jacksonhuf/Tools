import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addCompetitorObservation,
  createCompetitorOffer,
  fetchCompetitorOffers,
  fetchPriceHistory,
  fetchIngestStatus,
  fetchDynamicRule,
  unfreezeDynamicRule,
  checkCompetitorStale,
  flushRepricingEvents,
  processRepricingEvent,
  runIngest,
  type CompetitorOfferRow,
} from "../api/client";

const LISTINGS = [
  { id: "listing-ml-001", channel: "MERCADO_LIBRE" as const },
  { id: "listing-amz-001", channel: "AMAZON_MX" as const },
];

export function CompetitorsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [listingId, setListingId] = useState(LISTINGS[0].id);
  const [items, setItems] = useState<CompetitorOfferRow[]>([]);
  const [anchorMedian, setAnchorMedian] = useState<number | null>(null);
  const [buyBoxMxn, setBuyBoxMxn] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [ref, setRef] = useState("MLM-COMP-001");
  const [label, setLabel] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState(1399);
  const [shipping, setShipping] = useState(0);
  const [includeShipping, setIncludeShipping] = useState(false);
  const [buyBoxWinner, setBuyBoxWinner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingestTier, setIngestTier] = useState("T1");
  const [ruleFrozen, setRuleFrozen] = useState(false);
  const [staleFrozen, setStaleFrozen] = useState(false);
  const [ingestFailed, setIngestFailed] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchCompetitorOffers(locale, listingId);
      setItems(data.items);
      setAnchorMedian(data.anchor.median_mxn);
      setBuyBoxMxn(data.anchor.buy_box_mxn ?? null);
      setSelectedOffer((prev) =>
        prev && data.items.some((i) => i.id === prev)
          ? prev
          : (data.items[0]?.id ?? null)
      );
      const hist = await fetchPriceHistory(locale, listingId, "7d");
      setHistoryCount(hist.observations.length);
      const ingest = await fetchIngestStatus(locale, listingId);
      setIngestTier(ingest.tier);
      setIngestFailed(Boolean(ingest.ingest_failed));
      const dr = await fetchDynamicRule(locale, listingId);
      setRuleFrozen(dr.rule.frozen);
      setStaleFrozen(dr.stale.competitor_stale_frozen);
    } catch (e) {
      setError(String(e));
    }
  }, [locale, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addOffer = async () => {
    setError(null);
    setMessage(null);
    try {
      await createCompetitorOffer(locale, listingId, {
        external_ref: ref,
        label: label || undefined,
        is_primary: items.length === 0,
      });
      setMessage(t("competitorAdded"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const addObs = async () => {
    if (!selectedOffer) return;
    setError(null);
    setMessage(null);
    try {
      await addCompetitorObservation(locale, selectedOffer, {
        sale_price: salePrice,
        shipping_addon: shipping,
        include_shipping: includeShipping,
        buy_box_winner: buyBoxWinner,
      });
      setMessage(t("observationAdded"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const runPipeline = async () => {
    setError(null);
    setMessage(null);
    try {
      await checkCompetitorStale(locale, listingId);
      const ing = await runIngest(locale, listingId);
      const flushed = await flushRepricingEvents(locale, listingId);
      if (flushed.event?.id) {
        const proc = await processRepricingEvent(locale, flushed.event.id);
        setMessage(
          `${t("pipelineDone")}: ingest=${ing.observations_created}, ${t("suggestedVersion")}=${proc.version_id ?? "—"}`
        );
      } else {
        setMessage(t("pipelineNoEvent"));
      }
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const unfreeze = async () => {
    try {
      await unfreezeDynamicRule(locale, listingId);
      setMessage(t("ruleUnfrozen"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const listingLabel =
    listingId === "listing-ml-001" ? t("mercadoLibre") : t("amazonMx");

  return (
    <div className="page page-wide">
      <h1>{t("competitorsTitle")}</h1>
      <p className="hint">{t("competitorsHint")}</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section className="card controls">
        <label>
          {t("channel")}
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          >
            {LISTINGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.channel === "MERCADO_LIBRE"
                  ? t("mercadoLibre")
                  : t("amazonMx")}
              </option>
            ))}
          </select>
        </label>
        <p>
          {t("anchorMedian")}:{" "}
          {anchorMedian != null ? `${anchorMedian} MXN` : "—"} ·{" "}
          {t("buyBoxPrice")}:{" "}
          <span data-testid="competitor-buy-box-mxn">
            {buyBoxMxn != null ? `${buyBoxMxn} MXN` : "—"}
          </span>{" "}
          · {t("historyPoints", { count: historyCount })} ({listingLabel}) ·{" "}
          {t("ingestTier")}: {ingestTier}
          {staleFrozen && (
            <span className="status status-expired"> {t("staleFrozen")}</span>
          )}
          {ruleFrozen && (
            <span className="status status-pending_approval">
              {" "}
              {t("ruleFrozen")}
            </span>
          )}
          {ingestFailed && (
            <span className="status status-expired"> {t("ingestFailed")}</span>
          )}
        </p>
        {ruleFrozen && (
          <button type="button" onClick={() => void unfreeze()}>
            {t("unfreezeRule")}
          </button>
        )}
        <button type="button" className="primary" onClick={() => void runPipeline()}>
          {t("runIngestPipeline")}
        </button>
      </section>

      <section className="card">
        <h2>{t("addCompetitor")}</h2>
        <label>
          {t("externalRef")}
          <input value={ref} onChange={(e) => setRef(e.target.value)} />
        </label>
        <label>
          {t("competitorLabel")}
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <button type="button" onClick={() => void addOffer()}>
          {t("addCompetitor")}
        </button>
      </section>

      <section className="card">
        <h2>{t("competitorList")}</h2>
        {items.length === 0 ? (
          <p>{t("noCompetitors")}</p>
        ) : (
          <table className="batch-table">
            <thead>
              <tr>
                <th>{t("externalRef")}</th>
                <th>{t("competitorLabel")}</th>
                <th>{t("latestEffective")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className={selectedOffer === it.id ? "selected" : ""}
                  onClick={() => setSelectedOffer(it.id)}
                >
                  <td>{it.external_ref}</td>
                  <td>{it.label ?? "—"}</td>
                  <td>
                    {it.latest_effective_mxn != null
                      ? `${it.latest_effective_mxn} MXN`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedOffer && (
        <section className="card">
          <h2>{t("addObservation")}</h2>
          <label>
            {t("salePrice")}
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
            />
          </label>
          <label>
            {t("shippingAddon")}
            <input
              type="number"
              value={shipping}
              onChange={(e) => setShipping(Number(e.target.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeShipping}
              onChange={(e) => setIncludeShipping(e.target.checked)}
            />
            {t("includeShipping")}
          </label>
          <label>
            <input
              type="checkbox"
              checked={buyBoxWinner}
              onChange={(e) => setBuyBoxWinner(e.target.checked)}
              data-testid="buy-box-winner-checkbox"
            />
            {t("buyBoxWinner")}
          </label>
          <button type="button" className="primary" onClick={() => void addObs()}>
            {t("addObservation")}
          </button>
        </section>
      )}
    </div>
  );
}
