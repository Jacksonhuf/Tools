import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Surface } from "@/components/primitives/Surface";
import { FormField, FormRow } from "@/components/patterns/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export type PricingMode = "cost" | "competitive_with_floor";

export function PricingControlsPanel({
  mode,
  onModeChange,
  margin,
  onMarginChange,
  competitorMl,
  onCompetitorMlChange,
  competitorAmz,
  onCompetitorAmzChange,
  extra,
}: {
  mode: PricingMode;
  onModeChange: (mode: PricingMode) => void;
  margin: number;
  onMarginChange: (margin: number) => void;
  competitorMl: number;
  onCompetitorMlChange: (v: number) => void;
  competitorAmz: number;
  onCompetitorAmzChange: (v: number) => void;
  extra?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Surface variant="elevated" padding="md" className="mb-6">
      <FormRow cols={mode === "cost" ? 2 : 3}>
        <FormField label={t("pricingMode")}>
          <Select
            value={mode}
            onValueChange={(v) => onModeChange(v as PricingMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">{t("modeCost")}</SelectItem>
              <SelectItem value="competitive_with_floor">
                {t("modeCompetitive")}
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {mode === "cost" ? (
          <FormField
            label={`${t("targetMargin")}: ${margin}%`}
            hint={t("pricingMarginHint")}
          >
            <Slider
              min={5}
              max={40}
              step={1}
              value={[margin]}
              onValueChange={([v]) => onMarginChange(v)}
            />
          </FormField>
        ) : (
          <>
            <FormField label={`${t("competitorPrice")} (ML)`}>
              <Input
                type="number"
                value={competitorMl}
                onChange={(e) => onCompetitorMlChange(Number(e.target.value))}
              />
            </FormField>
            <FormField label={`${t("competitorPrice")} (Amazon)`}>
              <Input
                type="number"
                value={competitorAmz}
                onChange={(e) => onCompetitorAmzChange(Number(e.target.value))}
              />
            </FormField>
          </>
        )}
      </FormRow>
      {extra && <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">{extra}</div>}
    </Surface>
  );
}
