import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applySharedFeeTemplate,
  DEMO_SKU,
  fetchPricingContext,
  fetchSharedFeeTemplates,
  patchSkuPolicy,
  batchPatchSkuPolicies,
  fetchCategoryRuleTemplates,
  downloadCategoryRuleTemplatesCsv,
  downloadCategoryRuleTemplateCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadPricingContextCsv,
  downloadLatestRepricingBatchJobCsv,
  createCopilotSession,
  downloadCopilotSessionCsv,
  downloadSharedFeeTemplatesCsv,
  downloadSharedFeeTemplateCsv,
  downloadTenantSharedFeeTemplatesCsv,
} from "../api/client";
import { PageIntent } from "@/components/patterns/PageIntent";
import {
  FormActions,
  FormField,
  FormRow,
  FormSection,
} from "@/components/patterns/FormField";
import { ExportHub } from "@/components/patterns/ExportHub";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PolicyConfigPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [targetMargin, setTargetMargin] = useState(20);
  const [minMargin, setMinMargin] = useState(10);
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; channel: string }>
  >([]);
  const [categoryTemplates, setCategoryTemplates] = useState<
    Array<{ category_id: string; name: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ctx, tpl, catTpl] = await Promise.all([
        fetchPricingContext(locale, "MERCADO_LIBRE"),
        fetchSharedFeeTemplates(locale),
        fetchCategoryRuleTemplates(locale),
      ]);
      setTargetMargin(ctx.policy.target_margin_pct);
      setMinMargin(ctx.policy.min_margin_pct);
      setTemplates(
        tpl.items.map((row) => ({
          id: row.id,
          name: row.name,
          channel: row.channel,
        }))
      );
      setCategoryTemplates(catTpl.items);
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePolicy = async () => {
    setError(null);
    try {
      await patchSkuPolicy(locale, DEMO_SKU, {
        target_margin_pct: targetMargin,
        min_margin_pct: minMargin,
      });
      setMessage(t("policySaved"));
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const applyTemplate = async (templateId: string) => {
    setError(null);
    try {
      await applySharedFeeTemplate(locale, DEMO_SKU, templateId);
      setMessage(t("feeTemplateApplied"));
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="space-y-4" data-testid="policy-config-page">
      <PageIntent title={t("policyConfigTitle")} />

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

      <FormSection title={t("policyMargins")}>
        <FormRow>
          <FormField label={`${t("targetMargin")} (%)`} htmlFor="policy-target-margin">
            <Input
              id="policy-target-margin"
              type="number"
              data-testid="policy-target-margin"
              value={targetMargin}
              onChange={(e) => setTargetMargin(Number(e.target.value))}
            />
          </FormField>
          <FormField label={`${t("minMargin")} (%)`} htmlFor="policy-min-margin">
            <Input
              id="policy-min-margin"
              type="number"
              data-testid="policy-min-margin"
              value={minMargin}
              onChange={(e) => setMinMargin(Number(e.target.value))}
            />
          </FormField>
        </FormRow>
        <FormActions>
          <Button
            type="button"
            data-testid="policy-save"
            onClick={() => void savePolicy()}
          >
            {t("policySave")}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="policy-batch-apply"
            onClick={() =>
              void batchPatchSkuPolicies(locale, [
                {
                  sku_id: DEMO_SKU,
                  target_margin_pct: targetMargin,
                  min_margin_pct: minMargin,
                },
              ]).then((r) =>
                setMessage(
                  t("policyBatchDone", {
                    updated: r.updated.length,
                    errors: r.errors.length,
                  })
                )
              )
            }
          >
            {t("policyBatchSave")}
          </Button>
        </FormActions>
      </FormSection>

      <FormSection title={t("sharedFeeTemplates")}>
        <ExportHub
          title={t("sharedFeeTemplatesExportCsv")}
          description={t("exportHubHint")}
        >
          <button
            type="button"
            data-testid="policy-shared-fee-export"
            onClick={() =>
              void downloadSharedFeeTemplatesCsv(locale).then(() =>
                setMessage(t("sharedFeeTemplatesExportDone"))
              )
            }
          >
            {t("sharedFeeTemplatesExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-shared-fee-template-export"
            onClick={() =>
              void downloadSharedFeeTemplateCsv(
                locale,
                "fee-tpl-ml-electronics"
              ).then(() => setMessage(t("sharedFeeTemplateExportDone")))
            }
          >
            {t("sharedFeeTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-tenant-shared-fee-export"
            onClick={() =>
              void downloadTenantSharedFeeTemplatesCsv(locale, "tenant-demo").then(
                () => setMessage(t("tenantSharedFeeTemplatesExportDone"))
              )
            }
          >
            {t("tenantSharedFeeTemplatesExportCsv")}
          </button>
        </ExportHub>
        <ul className="mt-4 space-y-2">
          {templates.map((tpl) => (
            <li
              key={tpl.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-surface-2/50 px-3 py-2 text-sm"
            >
              <span>
                {tpl.name} ({tpl.channel})
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void applyTemplate(tpl.id)}
              >
                {t("feeTemplateApply")}
              </Button>
            </li>
          ))}
        </ul>
      </FormSection>

      <FormSection
        title={t("categoryRuleTemplatesTitle")}
        testId="policy-category-templates"
      >
        <ul className="space-y-2">
          {categoryTemplates.map((tpl) => (
            <li
              key={tpl.category_id}
              className="rounded-lg border border-border/50 bg-surface-2/50 px-3 py-2 text-sm"
            >
              <code className="text-xs">{tpl.category_id}</code> — {tpl.name}
            </li>
          ))}
        </ul>
        <ExportHub
          title={t("categoryRuleTemplatesExportCsv")}
          description={t("exportHubHint")}
          className="mt-4"
        >
          <button
            type="button"
            data-testid="policy-category-templates-export"
            onClick={() =>
              void downloadCategoryRuleTemplatesCsv(locale).then(() =>
                setMessage(t("categoryRuleTemplatesExportDone"))
              )
            }
          >
            {t("categoryRuleTemplatesExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-category-template-export"
            onClick={() =>
              void downloadCategoryRuleTemplateCsv(
                locale,
                "cat-electronics-mx"
              ).then(() => setMessage(t("categoryRuleTemplateExportDone")))
            }
          >
            {t("categoryRuleTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-sku-category-template-export"
            onClick={() =>
              void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("skuCategoryRuleTemplateExportDone"))
              )
            }
          >
            {t("skuCategoryRuleTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-pricing-context-export"
            onClick={() =>
              void downloadPricingContextCsv(locale, "MERCADO_LIBRE", DEMO_SKU).then(
                () => setMessage(t("policyPricingContextExportDone"))
              )
            }
          >
            {t("policyPricingContextExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-repricing-batch-job-export"
            onClick={() =>
              void downloadLatestRepricingBatchJobCsv(locale)
                .then(() => setMessage(t("policyRepricingBatchJobExportDone")))
                .catch(() => setMessage(t("policyRepricingBatchJobExportEmpty")))
            }
          >
            {t("policyRepricingBatchJobExportCsv")}
          </button>
          <button
            type="button"
            data-testid="policy-copilot-session-export"
            onClick={() =>
              void createCopilotSession(
                locale,
                "listing-ml-001",
                DEMO_SKU,
                "MERCADO_LIBRE"
              )
                .then((s) => downloadCopilotSessionCsv(locale, s.session_id))
                .then(() => setMessage(t("policyCopilotSessionExportDone")))
            }
          >
            {t("policyCopilotSessionExportCsv")}
          </button>
        </ExportHub>
      </FormSection>
    </div>
  );
}
