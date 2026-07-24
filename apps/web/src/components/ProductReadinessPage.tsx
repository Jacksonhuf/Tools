import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchFeatureFlags,
  fetchProductReadiness,
  downloadFeatureFlagsCsv,
  downloadProductReadinessCsv,
  downloadP5ReadinessCsv,
  downloadP4ReadinessCsv,
  downloadP3ReadinessCsv,
  downloadAgentMilestonesCsv,
  downloadAgentMilestoneCsv,
  downloadAgentReadinessCsv,
  downloadCompetitorAnchorCsv,
  downloadDigestQueuedJobsSummaryCsv,
  downloadRuleCompilerStatusCsv,
  downloadAuthStatusCsv,
  downloadChannelSandboxStatusCsv,
  downloadDigestDeadLetterSummaryCsv,
  downloadListingSyncScheduleCsv,
  downloadAdjustmentApprovalPolicyCsv,
  downloadOpsWorkersStatusSummaryCsv,
  DEMO_SKU,
  downloadPricingSnapshotCsv,
  downloadCrossChannelGuardCsv,
  downloadDigestScheduleCsv,
  downloadDynamicRepricingRuleCsv,
  downloadSkuRepricingQueueCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadReconciliationAlertsReportCsv,
  downloadPricingContextCsv,
  downloadLatestRepricingBatchJobCsv,
  downloadCategoryRuleTemplateCsv,
  createCopilotSession,
  downloadCopilotSessionCsv,
  downloadLatestQueuePriceVersionCsv,
  downloadVersionBackupCsv,
  downloadShopCsv,
  downloadProductReadinessCheckCsv,
  downloadFeatureFlagCsv,
  type FeatureFlagsSnapshot,
  type ProductReadinessSnapshot,
} from "../api/client";

export function ProductReadinessPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [readiness, setReadiness] = useState<ProductReadinessSnapshot | null>(
    null
  );
  const [flags, setFlags] = useState<FeatureFlagsSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pr, ff] = await Promise.all([
        fetchProductReadiness(locale),
        fetchFeatureFlags(locale),
      ]);
      setReadiness(pr);
      setFlags(ff);
    } catch (e) {
      setError(String(e));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page page-wide">
      <h1>{t("readinessTitle")}</h1>
      <p className="hint">{t("readinessHint")}</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="hint">{message}</p>}

      {readiness && (
        <section className="card" data-testid="product-readiness">
          <h2>{t("readinessMilestones")}</h2>
          <p data-testid="readiness-all-accepted">
            {readiness.all_accepted
              ? t("readinessAllAccepted")
              : t("readinessInProgress")}
          </p>
          <button
            type="button"
            data-testid="readiness-agent-readiness-export"
            onClick={() =>
              void downloadAgentReadinessCsv(locale).then(() =>
                setMessage(t("readinessAgentReadinessExportDone"))
              )
            }
          >
            {t("readinessAgentReadinessExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-competitor-anchor-export"
            onClick={() =>
              void downloadCompetitorAnchorCsv(locale, "listing-ml-001").then(
                () => setMessage(t("readinessCompetitorAnchorExportDone"))
              )
            }
          >
            {t("readinessCompetitorAnchorExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-digest-jobs-summary-export"
            onClick={() =>
              void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
                setMessage(t("readinessDigestJobsSummaryExportDone"))
              )
            }
          >
            {t("readinessDigestJobsSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-rule-compiler-export"
            onClick={() =>
              void downloadRuleCompilerStatusCsv(locale).then(() =>
                setMessage(t("readinessRuleCompilerExportDone"))
              )
            }
          >
            {t("readinessRuleCompilerExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-auth-export"
            onClick={() =>
              void downloadAuthStatusCsv(locale).then(() =>
                setMessage(t("readinessAuthExportDone"))
              )
            }
          >
            {t("readinessAuthExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-channel-sandbox-status-export"
            onClick={() =>
              void downloadChannelSandboxStatusCsv(locale).then(() =>
                setMessage(t("readinessChannelSandboxStatusExportDone"))
              )
            }
          >
            {t("readinessChannelSandboxStatusExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-digest-dlq-summary-export"
            onClick={() =>
              void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
                setMessage(t("readinessDigestDlqSummaryExportDone"))
              )
            }
          >
            {t("readinessDigestDlqSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-listing-sync-schedule-export"
            onClick={() =>
              void downloadListingSyncScheduleCsv(locale).then(() =>
                setMessage(t("readinessListingSyncScheduleExportDone"))
              )
            }
          >
            {t("readinessListingSyncScheduleExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-adjustment-approval-policy-export"
            onClick={() =>
              void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
                setMessage(t("readinessAdjustmentApprovalPolicyExportDone"))
              )
            }
          >
            {t("readinessAdjustmentApprovalPolicyExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-ops-workers-summary-export"
            onClick={() =>
              void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
                setMessage(t("readinessOpsWorkersSummaryExportDone"))
              )
            }
          >
            {t("readinessOpsWorkersSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-pricing-snapshot-export"
            onClick={() =>
              void downloadPricingSnapshotCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("readinessPricingSnapshotExportDone"))
              )
            }
          >
            {t("readinessPricingSnapshotExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-cross-channel-guard-export"
            onClick={() =>
              void downloadCrossChannelGuardCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("readinessCrossChannelGuardExportDone"))
              )
            }
          >
            {t("readinessCrossChannelGuardExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-digest-schedule-export"
            onClick={() =>
              void downloadDigestScheduleCsv(locale).then(() =>
                setMessage(t("readinessDigestScheduleExportDone"))
              )
            }
          >
            {t("readinessDigestScheduleExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-dynamic-repricing-rule-export"
            onClick={() =>
              void downloadDynamicRepricingRuleCsv(
                locale,
                "listing-ml-001"
              ).then(() => setMessage(t("readinessDynamicRepricingRuleExportDone")))
            }
          >
            {t("readinessDynamicRepricingRuleExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-repricing-queue-sku-export"
            onClick={() =>
              void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("readinessRepricingQueueSkuExportDone"))
              )
            }
          >
            {t("readinessRepricingQueueSkuExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-repricing-batch-shard-plan-export"
            onClick={() =>
              void downloadRepricingBatchShardPlanCsv(locale, DEMO_SKU, 2).then(
                () => setMessage(t("readinessRepricingBatchShardPlanExportDone"))
              )
            }
          >
            {t("readinessRepricingBatchShardPlanExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-sku-category-template-export"
            onClick={() =>
              void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("readinessSkuCategoryRuleTemplateExportDone"))
              )
            }
          >
            {t("readinessSkuCategoryRuleTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-reconciliation-report-export"
            onClick={() =>
              void downloadReconciliationAlertsReportCsv(locale).then(() =>
                setMessage(t("readinessReconciliationReportExportDone"))
              )
            }
          >
            {t("readinessReconciliationReportExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-pricing-context-export"
            onClick={() =>
              void downloadPricingContextCsv(locale, "MERCADO_LIBRE", DEMO_SKU).then(
                () => setMessage(t("readinessPricingContextExportDone"))
              )
            }
          >
            {t("readinessPricingContextExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-repricing-batch-job-export"
            onClick={() =>
              void downloadLatestRepricingBatchJobCsv(locale)
                .then(() => setMessage(t("readinessRepricingBatchJobExportDone")))
                .catch(() => setMessage(t("readinessRepricingBatchJobExportEmpty")))
            }
          >
            {t("readinessRepricingBatchJobExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-category-rule-template-export"
            onClick={() =>
              void downloadCategoryRuleTemplateCsv(
                locale,
                "cat-electronics-mx"
              ).then(() => setMessage(t("readinessCategoryRuleTemplateExportDone")))
            }
          >
            {t("readinessCategoryRuleTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-copilot-session-export"
            onClick={() =>
              void createCopilotSession(
                locale,
                "listing-ml-001",
                DEMO_SKU,
                "MERCADO_LIBRE"
              )
                .then((s) => downloadCopilotSessionCsv(locale, s.session_id))
                .then(() => setMessage(t("readinessCopilotSessionExportDone")))
            }
          >
            {t("readinessCopilotSessionExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-price-version-export"
            onClick={() =>
              void downloadLatestQueuePriceVersionCsv(locale, DEMO_SKU)
                .then(() => setMessage(t("readinessPriceVersionExportDone")))
                .catch(() => setMessage(t("readinessPriceVersionExportEmpty")))
            }
          >
            {t("readinessPriceVersionExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-version-backup-csv"
            onClick={() =>
              void downloadVersionBackupCsv(locale).then(() =>
                setMessage(t("readinessVersionBackupCsvDone"))
              )
            }
          >
            {t("readinessVersionBackupCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-shop-export"
            onClick={() =>
              void downloadShopCsv(locale, "shop-ml-demo").then(() =>
                setMessage(t("readinessShopExportDone"))
              )
            }
          >
            {t("readinessShopExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-milestones-export"
            onClick={() =>
              void downloadAgentMilestonesCsv(locale).then(() =>
                setMessage(t("readinessMilestonesExportDone"))
              )
            }
          >
            {t("readinessMilestonesExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-milestone-export"
            disabled={!readiness.milestones[0]}
            onClick={() => {
              const milestoneId = readiness.milestones[0]?.id;
              if (!milestoneId) return;
              void downloadAgentMilestoneCsv(locale, milestoneId).then(() =>
                setMessage(t("readinessMilestoneExportDone"))
              );
            }}
          >
            {t("readinessMilestoneExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-product-check-export"
            disabled={!readiness.p3.checks[0]}
            onClick={() => {
              const checkId = readiness.p3.checks[0]?.id;
              if (!checkId) return;
              void downloadProductReadinessCheckCsv(locale, checkId).then(() =>
                setMessage(t("readinessProductCheckExportDone"))
              );
            }}
          >
            {t("readinessProductCheckExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-product-export"
            onClick={() =>
              void downloadProductReadinessCsv(locale).then(() =>
                setMessage(t("readinessProductExportDone"))
              )
            }
          >
            {t("readinessProductExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-p3-export"
            onClick={() =>
              void downloadP3ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP3ExportDone"))
              )
            }
          >
            {t("readinessP3ExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-p4-export"
            onClick={() =>
              void downloadP4ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP4ExportDone"))
              )
            }
          >
            {t("readinessP4ExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-p5-export"
            onClick={() =>
              void downloadP5ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP5ExportDone"))
              )
            }
          >
            {t("readinessP5ExportCsv")}
          </button>
          <table className="batch-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("batchStatus")}</th>
                <th>{t("readinessSummary")}</th>
              </tr>
            </thead>
            <tbody>
              {readiness.milestones.map((m) => (
                <tr key={m.id}>
                  <td>
                    <code>{m.id}</code>
                  </td>
                  <td>
                    <span className={`status status-${m.status}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{m.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {flags && (
        <section className="card" data-testid="feature-flags-panel">
          <h2>{t("readinessFeatureFlags")}</h2>
          <button
            type="button"
            data-testid="readiness-feature-flags-export"
            onClick={() =>
              void downloadFeatureFlagsCsv(locale).then(() =>
                setMessage(t("readinessFeatureFlagsExportDone"))
              )
            }
          >
            {t("readinessFeatureFlagsExportCsv")}
          </button>
          <button
            type="button"
            data-testid="readiness-feature-flag-export"
            onClick={() =>
              void downloadFeatureFlagCsv(locale, "agent_copilot").then(() =>
                setMessage(t("readinessFeatureFlagExportDone"))
              )
            }
          >
            {t("readinessFeatureFlagExportCsv")}
          </button>
          <dl className="adapter-status-dl">
            {Object.entries(flags)
              .filter(([k]) => k !== "generated_at")
              .map(([key, value]) => (
                <div key={key}>
                  <dt>
                    <code>{key}</code>
                  </dt>
                  <dd>{value ? t("readinessFlagOn") : t("readinessFlagOff")}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
    </div>
  );
}
