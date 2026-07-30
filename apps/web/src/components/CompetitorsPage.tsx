import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addCompetitorObservation,
  createCompetitorOffer,
  fetchCompetitorOffers,
  fetchPriceHistory,
  fetchCompetitorCurve,
  fetchListingRepricingEvents,
  fetchIngestStatus,
  fetchDynamicRule,
  unfreezeDynamicRule,
  checkCompetitorStale,
  flushRepricingEvents,
  processRepricingEvent,
  runIngest,
  type CompetitorOfferRow,
} from "../api/client";
import { CompetitorsExportHub } from "./CompetitorsExportHub";
import { PageIntent } from "@/components/patterns/PageIntent";
import { AdvancedSection } from "@/components/patterns/AdvancedSection";
import {
  FormActions,
  FormField,
  FormRow,
  FormSection,
} from "@/components/patterns/FormField";
import { KpiStrip } from "@/components/patterns/KpiStrip";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
} from "@/components/patterns/DataTable";
import { KpiMetric } from "@/components/primitives/KpiMetric";
import { Surface } from "@/components/primitives/Surface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [curveDays, setCurveDays] = useState(0);
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
  const [latestObservationId, setLatestObservationId] = useState<string | null>(
    null
  );
  const [latestRepricingEventId, setLatestRepricingEventId] = useState<
    string | null
  >(null);
  const [latestCurveDate, setLatestCurveDate] = useState<string | null>(null);

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
      setLatestObservationId(hist.observations[0]?.id ?? null);
      const events = await fetchListingRepricingEvents(locale, listingId);
      setLatestRepricingEventId(events.items[0]?.id ?? null);
      const curve = await fetchCompetitorCurve(locale, listingId, "7d");
      setCurveDays(curve.points.length);
      setLatestCurveDate(curve.points[0]?.date ?? null);
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
    <div className="space-y-4">
      <PageIntent
        title={t("competitorsTitle")}
        description={t("competitorsHint")}
        actions={
          <Button type="button" onClick={() => void runPipeline()}>
            {t("runIngestPipeline")}
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Surface variant="elevated" className="space-y-4 p-5">
        <FormField label={t("channel")}>
          <Select value={listingId} onValueChange={setListingId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LISTINGS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.channel === "MERCADO_LIBRE"
                    ? t("mercadoLibre")
                    : t("amazonMx")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <KpiStrip className="mb-0">
          <KpiMetric
            label={t("anchorMedian")}
            value={anchorMedian != null ? `${anchorMedian} MXN` : "—"}
          />
          <KpiMetric
            label={t("buyBoxPrice")}
            value={
              <span data-testid="competitor-buy-box-mxn">
                {buyBoxMxn != null ? `${buyBoxMxn} MXN` : "—"}
              </span>
            }
          />
          <KpiMetric
            label={listingLabel}
            value={t("historyPoints", { count: historyCount })}
            trend={t("curveDays", { count: curveDays })}
          />
          <KpiMetric
            label={t("ingestTier")}
            value={ingestTier}
          />
        </KpiStrip>

        <div className="flex flex-wrap items-center gap-2">
          {staleFrozen && (
            <Badge variant="destructive">{t("staleFrozen")}</Badge>
          )}
          {ruleFrozen && (
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/10 text-warning"
            >
              {t("ruleFrozen")}
            </Badge>
          )}
          {ingestFailed && (
            <Badge variant="destructive">{t("ingestFailed")}</Badge>
          )}
          {ruleFrozen && (
            <Button type="button" variant="outline" size="sm" onClick={() => void unfreeze()}>
              {t("unfreezeRule")}
            </Button>
          )}
        </div>
      </Surface>

      <AdvancedSection
        title={t("advancedSection")}
        description={t("opsAdvancedHint")}
      >
        <CompetitorsExportHub
          locale={locale}
          listingId={listingId}
          selectedOffer={selectedOffer}
          t={t}
          setMessage={setMessage}
          latestObservationId={latestObservationId}
          latestRepricingEventId={latestRepricingEventId}
          latestCurveDate={latestCurveDate}
        />
      </AdvancedSection>

      <FormSection title={t("addCompetitor")}>
        <FormRow>
          <FormField label={t("externalRef")} htmlFor="competitor-ref">
            <Input
              id="competitor-ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </FormField>
          <FormField label={t("competitorLabel")} htmlFor="competitor-label">
            <Input
              id="competitor-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </FormField>
        </FormRow>
        <FormActions>
          <Button type="button" onClick={() => void addOffer()}>
            {t("addCompetitor")}
          </Button>
        </FormActions>
      </FormSection>

      <FormSection title={t("competitorList")}>
        <DataTable
          testId="competitor-offers-table"
          isEmpty={items.length === 0}
          emptyMessage={t("noCompetitors")}
          maxHeight={360}
        >
          <DataTableRoot>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>{t("externalRef")}</DataTableHead>
                <DataTableHead>{t("competitorLabel")}</DataTableHead>
                <DataTableHead>{t("latestEffective")}</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {items.map((it) => (
                <DataTableRow
                  key={it.id}
                  selected={selectedOffer === it.id}
                  onClick={() => setSelectedOffer(it.id)}
                >
                  <DataTableCell>{it.external_ref}</DataTableCell>
                  <DataTableCell>{it.label ?? "—"}</DataTableCell>
                  <DataTableCell>
                    {it.latest_effective_mxn != null
                      ? `${it.latest_effective_mxn} MXN`
                      : "—"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTableRoot>
        </DataTable>
      </FormSection>

      {selectedOffer && (
        <FormSection title={t("addObservation")}>
          <FormRow cols={3}>
            <FormField label={t("salePrice")} htmlFor="obs-sale-price">
              <Input
                id="obs-sale-price"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
              />
            </FormField>
            <FormField label={t("shippingAddon")} htmlFor="obs-shipping">
              <Input
                id="obs-shipping"
                type="number"
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value))}
              />
            </FormField>
          </FormRow>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="obs-include-shipping"
                checked={includeShipping}
                onCheckedChange={(v) => setIncludeShipping(v === true)}
              />
              <Label htmlFor="obs-include-shipping">{t("includeShipping")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="obs-buy-box"
                checked={buyBoxWinner}
                onCheckedChange={(v) => setBuyBoxWinner(v === true)}
                data-testid="buy-box-winner-checkbox"
              />
              <Label htmlFor="obs-buy-box">{t("buyBoxWinner")}</Label>
            </div>
          </div>
          <FormActions>
            <Button type="button" onClick={() => void addObs()}>
              {t("addObservation")}
            </Button>
          </FormActions>
        </FormSection>
      )}
    </div>
  );
}
