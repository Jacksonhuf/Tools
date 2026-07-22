import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applySharedFeeTemplate,
  DEMO_SKU,
  fetchPricingContext,
  fetchSharedFeeTemplates,
  patchSkuPolicy,
} from "../api/client";

export function PolicyConfigPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [targetMargin, setTargetMargin] = useState(20);
  const [minMargin, setMinMargin] = useState(10);
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; channel: string }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ctx, tpl] = await Promise.all([
        fetchPricingContext(locale, "MERCADO_LIBRE"),
        fetchSharedFeeTemplates(locale),
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
    </div>
  );
}
