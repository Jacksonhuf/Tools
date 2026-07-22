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
} from "../api/client";

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
    <div className="page page-wide" data-testid="policy-config-page">
      <h1>{t("policyConfigTitle")}</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section className="card">
        <h2>{t("policyMargins")}</h2>
        <label>
          {t("targetMargin")} (%)
          <input
            type="number"
            data-testid="policy-target-margin"
            value={targetMargin}
            onChange={(e) => setTargetMargin(Number(e.target.value))}
          />
        </label>
        <label>
          {t("minMargin")} (%)
          <input
            type="number"
            data-testid="policy-min-margin"
            value={minMargin}
            onChange={(e) => setMinMargin(Number(e.target.value))}
          />
        </label>
        <button type="button" data-testid="policy-save" onClick={() => void savePolicy()}>
          {t("policySave")}
        </button>
        <button
          type="button"
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
        </button>
      </section>

      <section className="card">
        <h2>{t("sharedFeeTemplates")}</h2>
        <ul>
          {templates.map((tpl) => (
            <li key={tpl.id}>
              {tpl.name} ({tpl.channel}){" "}
              <button type="button" onClick={() => void applyTemplate(tpl.id)}>
                {t("feeTemplateApply")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" data-testid="policy-category-templates">
        <h2>{t("categoryRuleTemplatesTitle")}</h2>
        <ul>
          {categoryTemplates.map((tpl) => (
            <li key={tpl.category_id}>
              <code>{tpl.category_id}</code> — {tpl.name}
            </li>
          ))}
        </ul>
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
      </section>
    </div>
  );
}
