import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  compileDynamicRule,
  confirmCompiledDynamicRule,
  createCopilotSession,
  DEMO_SKU,
  fetchAgentToolAudit,
  enqueueDailyDigest,
  fetchAgentReadiness,
  fetchAgentTools,
  dispatchDailyAgentDigest,
  fetchDailyAgentDigest,
  downloadAgentDigestCsv,
  downloadAgentDigestDateCsv,
  downloadAgentToolAuditCsv,
  fetchDigestSchedule,
  fetchDigestDeadLetterSummary,
  downloadDigestDeadLetterCsv,
  downloadDigestDeadLetterSummaryCsv,
  fetchDigestQueuedJobsSummary,
  downloadDigestQueuedJobsCsv,
  downloadDigestQueuedJobCsv,
  downloadDigestQueuedJobsSummaryCsv,
  downloadDigestDispatchesCsv,
  downloadDigestDispatchCsv,
  downloadDigestDeadLetterJobCsv,
  downloadAgentToolAuditRowCsv,
  downloadRuleCompilerStatusCsv,
  downloadDigestScheduleCsv,
  downloadCopilotSessionCsv,
  downloadP4ReadinessCsv,
  downloadAgentToolsCsv,
  downloadAgentToolRowCsv,
  downloadAgentReadinessCsv,
  downloadAgentReadinessCheckCsv,
  downloadProductReadinessCsv,
  downloadCompetitorAnchorCsv,
  downloadAuthStatusCsv,
  downloadChannelSandboxStatusCsv,
  downloadListingSyncScheduleCsv,
  downloadAgentMilestonesCsv,
  downloadAdjustmentApprovalPolicyCsv,
  downloadOpsWorkersStatusSummaryCsv,
  downloadPricingSnapshotCsv,
  downloadCrossChannelGuardCsv,
  downloadDynamicRepricingRuleCsv,
  downloadSkuRepricingQueueCsv,
  downloadRepricingBatchShardPlanCsv,
  downloadSkuCategoryRuleTemplateCsv,
  downloadReconciliationAlertsReportCsv,
  downloadPricingContextCsv,
  downloadLatestRepricingBatchJobCsv,
  downloadCategoryRuleTemplateCsv,
  downloadRepricingBatchJobsSummaryCsv,
  downloadFeatureFlagsCsv,
  downloadListingIngestStatusCsv,
  updateDigestSchedule,
  runDigestRunDue,
  fetchRuleCompilerStatus,
  invokeAgentTool,
  LISTING_BY_CHANNEL,
  processDigestJobs,
  sendCopilotMessage,
  type Channel,
  type CopilotChatMessage,
} from "../api/client";

const LISTINGS: Array<{ id: string; channel: Channel }> = [
  { id: LISTING_BY_CHANNEL.MERCADO_LIBRE, channel: "MERCADO_LIBRE" },
  { id: LISTING_BY_CHANNEL.AMAZON_MX, channel: "AMAZON_MX" },
];

export function CopilotPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [listingId, setListingId] = useState(LISTINGS[0].id);
  const [nlText, setNlText] = useState(() => t("copilotNlExample"));
  const [compileId, setCompileId] = useState<string | null>(null);
  const [draftJson, setDraftJson] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [compilerLabel, setCompilerLabel] = useState<string | null>(null);
  const [contextSnippet, setContextSnippet] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<
    Array<{ name: string; mode: string; description: string }>
  >([]);
  const [audit, setAudit] = useState<
    Array<{ id: string; tool_name: string; result_summary: string; created_at: string }>
  >([]);
  const [adjPrice, setAdjPrice] = useState("199");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<CopilotChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [digestNarrative, setDigestNarrative] = useState<string | null>(null);
  const [digestEmailStub, setDigestEmailStub] = useState<string | null>(null);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestCron, setDigestCron] = useState("0 8 * * *");
  const [digestLastRun, setDigestLastRun] = useState<string | null>(null);
  const [digestDlq, setDigestDlq] = useState<{
    queue: { dead_letter: number; queued: number };
    items: Array<{ job_id: string; error: string | null }>;
  } | null>(null);
  const [digestJobs, setDigestJobs] = useState<{
    queue: { queued: number; failed: number; dead_letter: number };
    items: Array<{ job_id: string; status: string }>;
  } | null>(null);
  const [p4Ready, setP4Ready] = useState<boolean | null>(null);
  const [lastDispatchJobId, setLastDispatchJobId] = useState<string | null>(
    null
  );
  const [digestDate, setDigestDate] = useState<string | null>(null);
  const [firstReadinessCheckId, setFirstReadinessCheckId] = useState<
    string | null
  >(null);

  const selected = LISTINGS.find((l) => l.id === listingId)!;

  useEffect(() => {
    setNlText(t("copilotNlExample"));
  }, [locale, t]);

  useEffect(() => {
    void (async () => {
      try {
        const s = await createCopilotSession(
          locale,
          listingId,
          DEMO_SKU,
          selected.channel,
          true
        );
        setSessionId(s.session_id);
        setChatMessages(s.messages ?? []);
      } catch {
        setSessionId(null);
      }
    })();
  }, [locale, listingId, selected.channel]);

  const loadDigest = async () => {
    setError(null);
    try {
      const d = await fetchDailyAgentDigest(locale);
      setDigestNarrative(d.narrative);
      setDigestDate(d.date);
    } catch (e) {
      setError(String(e));
    }
  };

  const runDigestQueue = async () => {
    setError(null);
    try {
      const enq = await enqueueDailyDigest(locale);
      const proc = await processDigestJobs(locale, 1);
      const done = proc.processed[0];
      setMessage(
        `${t("copilotDigestQueueOk")}: ${enq.job.job_id} → ${done?.status ?? "?"}`
      );
      await loadDigest();
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  const runDigestDispatch = async () => {
    setError(null);
    try {
      const out = await dispatchDailyAgentDigest(locale);
      setDigestNarrative(out.digest.narrative);
      setLastDispatchJobId(out.job.job_id);
      const mail = out.job.deliveries[0];
      setDigestEmailStub(
        mail ? `${mail.to} — ${mail.subject}` : null
      );
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  const refreshAudit = async () => {
    const out = await fetchAgentToolAudit(locale, 15);
    setAudit(out.items);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [toolRes, status, readiness] = await Promise.all([
          fetchAgentTools(locale),
          fetchRuleCompilerStatus(locale),
          fetchAgentReadiness(locale),
        ]);
        setTools(toolRes.items);
        setCompilerLabel(`${status.driver} — ${status.note}`);
        setP4Ready(readiness.ready);
        setFirstReadinessCheckId(readiness.checks[0]?.id ?? null);
        await refreshAudit();
        await loadDigest();
        const sched = await fetchDigestSchedule(locale);
        setDigestEnabled(sched.enabled);
        setDigestCron(sched.cron);
        setDigestLastRun(sched.last_dispatch_at);
        const dlq = await fetchDigestDeadLetterSummary(locale);
        setDigestDlq({
          queue: dlq.queue,
          items: dlq.items,
        });
        const jobs = await fetchDigestQueuedJobsSummary(locale);
        setDigestJobs({ queue: jobs.queue, items: jobs.items });
      } catch {
        /* non-fatal on demo load */
      }
    })();
  }, [locale]);

  const loadContext = async () => {
    setError(null);
    setMessage(null);
    try {
      const out = await invokeAgentTool(
        locale,
        "tool_get_pricing_context",
        { sku_id: DEMO_SKU, channel: selected.channel },
        "copilot-web"
      );
      const result = out.result as {
        sku?: { name?: string; landed_cost?: { formatted?: string } };
        versions?: { active?: { publish_price?: { formatted?: string } } };
      };
      const name = result.sku?.name ?? DEMO_SKU;
      const landed = result.sku?.landed_cost?.formatted ?? "—";
      const active = result.versions?.active?.publish_price?.formatted ?? "—";
      setContextSnippet(`${name} · ${t("landedCost")}: ${landed} · ${t("activePrice")}: ${active}`);
      setMessage(`${t("copilotContextOk")} (${out.audit_id})`);
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  const createAdjustmentDraft = async () => {
    setError(null);
    setMessage(null);
    const price = Number(adjPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Invalid price");
      return;
    }
    try {
      const out = await invokeAgentTool(
        locale,
        "tool_create_adjustment_draft",
        {
          reason_code: "COPILOT_DRAFT",
          items: [{ listing_id: listingId, explicit_price_mxn: price }],
        },
        "copilot-web"
      );
      const batch = out.result as { id?: string; status?: string };
      setMessage(
        `${t("copilotAdjustmentOk")}: ${batch.id ?? "?"} (${batch.status ?? "?"})`
      );
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  const compile = async () => {
    setError(null);
    setMessage(null);
    setCompileId(null);
    setDraftJson(null);
    try {
      const res = await compileDynamicRule(locale, listingId, nlText, sessionId ?? undefined);
      setCompileId(res.compile_id);
      setDraftJson(JSON.stringify(res.draft, null, 2));
      setExplanation(res.explanation);
      if (res.compiler) {
        setCompilerLabel(
          `${res.compiler.driver}${res.compiler.model ? ` / ${res.compiler.model}` : ""}`
        );
      }
      setMessage(t("copilotCompileOk"));
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  const sendChat = async () => {
    if (!sessionId || !chatInput.trim()) return;
    setError(null);
    setMessage(null);
    try {
      const res = await sendCopilotMessage(
        locale,
        sessionId,
        listingId,
        chatInput.trim()
      );
      setChatMessages(res.messages);
      setChatInput("");
      if (res.compile_id) {
        setCompileId(res.compile_id);
        setDraftJson(JSON.stringify(res.draft, null, 2));
        setExplanation(res.explanation ?? null);
        if (res.compiler) {
          setCompilerLabel(
            `${res.compiler.driver}${res.compiler.model ? ` / ${res.compiler.model}` : ""}`
          );
        }
        setMessage(t("copilotCompileOk"));
      }
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  const confirm = async () => {
    if (!compileId) return;
    setError(null);
    try {
      const res = await confirmCompiledDynamicRule(locale, listingId, compileId);
      setMessage(
        `${t("copilotConfirmOk")}: ${res.rule.action} / ${res.rule.anchor_type}`
      );
      setCompileId(null);
      await refreshAudit();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="page page-wide">
      <h1>{t("copilotTitle")}</h1>
      <p className="hint">{t("copilotHint")}</p>
      {p4Ready != null && (
        <p className="hint" data-testid="p4-readiness">
          P4: {p4Ready ? t("copilotP4Ready") : t("copilotP4NotReady")}{" "}
          <button
            type="button"
            data-testid="copilot-p4-readiness-export"
            onClick={() =>
              void downloadP4ReadinessCsv(locale).then(() =>
                setMessage(t("readinessP4ExportDone"))
              )
            }
          >
            {t("readinessP4ExportCsv")}
          </button>
        </p>
      )}
      {compilerLabel && (
        <p className="hint" data-testid="compiler-status">
          {t("copilotCompilerStatus")}: {compilerLabel}
        </p>
      )}
      <p>
        <button
          type="button"
          data-testid="copilot-rule-compiler-export"
          onClick={() =>
            void downloadRuleCompilerStatusCsv(locale).then(() =>
              setMessage(t("copilotRuleCompilerExportDone"))
            )
          }
        >
          {t("copilotRuleCompilerExportCsv")}
        </button>
      </p>
      <section className="card" data-testid="copilot-digest-schedule">
        <h2>{t("copilotDigestScheduleTitle")}</h2>
        <label>
          <input
            type="checkbox"
            checked={digestEnabled}
            onChange={(e) => setDigestEnabled(e.target.checked)}
          />
          {t("copilotDigestScheduleEnabled")}
        </label>
        <label>
          {t("copilotDigestScheduleCron")}
          <input
            type="text"
            value={digestCron}
            onChange={(e) => setDigestCron(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
        </label>
        <p className="hint">
          {t("copilotDigestLastDispatch")}:{" "}
          {digestLastRun ? new Date(digestLastRun).toLocaleString(locale) : "—"}
        </p>
        <button
          type="button"
          data-testid="copilot-digest-schedule-export"
          onClick={() =>
            void downloadDigestScheduleCsv(locale).then(() =>
              setMessage(t("copilotDigestScheduleExportDone"))
            )
          }
        >
          {t("copilotDigestScheduleExportCsv")}
        </button>
        <div className="shop-actions">
          <button
            type="button"
            onClick={() =>
              void updateDigestSchedule(locale, {
                enabled: digestEnabled,
                cron: digestCron,
              }).then(() => setMessage(t("policySaved")))
            }
          >
            {t("copilotDigestScheduleSave")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-run-due"
            onClick={() =>
              void runDigestRunDue(locale)
                .then((r) => {
                  setDigestNarrative(r.digest.narrative);
                  setDigestLastRun(r.schedule.last_dispatch_at);
                  setMessage(t("copilotDigestRunDueDone"));
                })
                .catch(() => setError(t("copilotDigestScheduleDisabled")))
            }
          >
            {t("copilotDigestRunDue")}
          </button>
          <button
            type="button"
            data-testid="copilot-readiness-export"
            onClick={() =>
              void downloadAgentReadinessCsv(locale).then(() =>
                setMessage(t("copilotReadinessExportDone"))
              )
            }
          >
            {t("copilotReadinessExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-readiness-check-export"
            disabled={!firstReadinessCheckId}
            onClick={() => {
              const checkId = firstReadinessCheckId;
              if (!checkId) return;
              void downloadAgentReadinessCheckCsv(locale, checkId).then(() =>
                setMessage(t("copilotReadinessCheckExportDone"))
              );
            }}
          >
            {t("copilotReadinessCheckExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-tools-export"
            onClick={() => void downloadAgentToolsCsv(locale)}
          >
            {t("copilotToolsExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-repricing-batch-summary-export"
            onClick={() =>
              void downloadRepricingBatchJobsSummaryCsv(locale).then(() =>
                setMessage(t("copilotRepricingBatchSummaryExportDone"))
              )
            }
          >
            {t("copilotRepricingBatchSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-feature-flags-export"
            onClick={() =>
              void downloadFeatureFlagsCsv(locale).then(() =>
                setMessage(t("copilotFeatureFlagsExportDone"))
              )
            }
          >
            {t("copilotFeatureFlagsExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-listing-ingest-status-export"
            onClick={() =>
              void downloadListingIngestStatusCsv(
                locale,
                LISTING_BY_CHANNEL.MERCADO_LIBRE
              ).then(() => setMessage(t("copilotListingIngestStatusExportDone")))
            }
          >
            {t("copilotListingIngestStatusExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-product-readiness-export"
            onClick={() =>
              void downloadProductReadinessCsv(locale).then(() =>
                setMessage(t("copilotProductReadinessExportDone"))
              )
            }
          >
            {t("copilotProductReadinessExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-competitor-anchor-export"
            onClick={() =>
              void downloadCompetitorAnchorCsv(
                locale,
                LISTING_BY_CHANNEL.MERCADO_LIBRE
              ).then(() => setMessage(t("copilotCompetitorAnchorExportDone")))
            }
          >
            {t("copilotCompetitorAnchorExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-auth-export"
            onClick={() =>
              void downloadAuthStatusCsv(locale).then(() =>
                setMessage(t("copilotAuthExportDone"))
              )
            }
          >
            {t("copilotAuthExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-channel-sandbox-status-export"
            onClick={() =>
              void downloadChannelSandboxStatusCsv(locale).then(() =>
                setMessage(t("copilotChannelSandboxStatusExportDone"))
              )
            }
          >
            {t("copilotChannelSandboxStatusExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-listing-sync-schedule-export"
            onClick={() =>
              void downloadListingSyncScheduleCsv(locale).then(() =>
                setMessage(t("copilotListingSyncScheduleExportDone"))
              )
            }
          >
            {t("copilotListingSyncScheduleExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-agent-milestones-export"
            onClick={() =>
              void downloadAgentMilestonesCsv(locale).then(() =>
                setMessage(t("copilotAgentMilestonesExportDone"))
              )
            }
          >
            {t("copilotAgentMilestonesExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-adjustment-approval-policy-export"
            onClick={() =>
              void downloadAdjustmentApprovalPolicyCsv(locale).then(() =>
                setMessage(t("copilotAdjustmentApprovalPolicyExportDone"))
              )
            }
          >
            {t("copilotAdjustmentApprovalPolicyExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-ops-workers-summary-export"
            onClick={() =>
              void downloadOpsWorkersStatusSummaryCsv(locale).then(() =>
                setMessage(t("copilotOpsWorkersSummaryExportDone"))
              )
            }
          >
            {t("copilotOpsWorkersSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-pricing-snapshot-export"
            onClick={() =>
              void downloadPricingSnapshotCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("copilotPricingSnapshotExportDone"))
              )
            }
          >
            {t("copilotPricingSnapshotExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-cross-channel-guard-export"
            onClick={() =>
              void downloadCrossChannelGuardCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("copilotCrossChannelGuardExportDone"))
              )
            }
          >
            {t("copilotCrossChannelGuardExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-dynamic-repricing-rule-export"
            onClick={() =>
              void downloadDynamicRepricingRuleCsv(
                locale,
                LISTING_BY_CHANNEL.MERCADO_LIBRE
              ).then(() => setMessage(t("copilotDynamicRepricingRuleExportDone")))
            }
          >
            {t("copilotDynamicRepricingRuleExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-repricing-queue-sku-export"
            onClick={() =>
              void downloadSkuRepricingQueueCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("copilotRepricingQueueSkuExportDone"))
              )
            }
          >
            {t("copilotRepricingQueueSkuExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-repricing-batch-shard-plan-export"
            onClick={() =>
              void downloadRepricingBatchShardPlanCsv(locale, DEMO_SKU, 2).then(
                () => setMessage(t("copilotRepricingBatchShardPlanExportDone"))
              )
            }
          >
            {t("copilotRepricingBatchShardPlanExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-sku-category-template-export"
            onClick={() =>
              void downloadSkuCategoryRuleTemplateCsv(locale, DEMO_SKU).then(() =>
                setMessage(t("copilotSkuCategoryRuleTemplateExportDone"))
              )
            }
          >
            {t("copilotSkuCategoryRuleTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-reconciliation-report-export"
            onClick={() =>
              void downloadReconciliationAlertsReportCsv(locale).then(() =>
                setMessage(t("copilotReconciliationReportExportDone"))
              )
            }
          >
            {t("copilotReconciliationReportExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-pricing-context-export"
            onClick={() =>
              void downloadPricingContextCsv(
                locale,
                selected.channel,
                DEMO_SKU
              ).then(() => setMessage(t("copilotPricingContextExportDone")))
            }
          >
            {t("copilotPricingContextExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-repricing-batch-job-export"
            onClick={() =>
              void downloadLatestRepricingBatchJobCsv(locale)
                .then(() => setMessage(t("copilotRepricingBatchJobExportDone")))
                .catch(() => setMessage(t("copilotRepricingBatchJobExportEmpty")))
            }
          >
            {t("copilotRepricingBatchJobExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-category-rule-template-export"
            onClick={() =>
              void downloadCategoryRuleTemplateCsv(
                locale,
                "cat-electronics-mx"
              ).then(() => setMessage(t("copilotCategoryRuleTemplateExportDone")))
            }
          >
            {t("copilotCategoryRuleTemplateExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-tool-row-export"
            disabled={!tools[0]}
            onClick={() => {
              const toolName = tools[0]?.name;
              if (!toolName) return;
              void downloadAgentToolRowCsv(locale, toolName).then(() =>
                setMessage(t("copilotToolRowExportDone"))
              );
            }}
          >
            {t("copilotToolRowExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-audit-export"
            onClick={() => void downloadAgentToolAuditCsv(locale)}
          >
            {t("copilotAuditExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-audit-row-export"
            disabled={!audit[0]}
            onClick={() => {
              const auditId = audit[0]?.id;
              if (!auditId) return;
              void downloadAgentToolAuditRowCsv(locale, auditId).then(() =>
                setMessage(t("copilotAuditRowExportDone"))
              );
            }}
          >
            {t("copilotAuditRowExportCsv")}
          </button>
        </div>
      </section>
      <section className="card" data-testid="copilot-digest-jobs">
        <h2>{t("copilotDigestJobsTitle")}</h2>
        <p className="hint" data-testid="copilot-digest-jobs-summary">
          {digestJobs
            ? t("copilotDigestJobsSummary", {
                queued: digestJobs.queue.queued,
                failed: digestJobs.queue.failed,
                dead: digestJobs.queue.dead_letter,
              })
            : t("copilotDigestJobsLoading")}
        </p>
        <div className="shop-actions">
          <button
            type="button"
            data-testid="copilot-digest-dispatches-export"
            onClick={() => void downloadDigestDispatchesCsv(locale)}
          >
            {t("copilotDigestDispatchesExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-dispatch-export"
            disabled={!lastDispatchJobId}
            onClick={() => {
              const jobId = lastDispatchJobId;
              if (!jobId) return;
              void downloadDigestDispatchCsv(locale, jobId).then(() =>
                setMessage(t("copilotDigestDispatchExportDone"))
              );
            }}
          >
            {t("copilotDigestDispatchExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-jobs-summary-export"
            onClick={() =>
              void downloadDigestQueuedJobsSummaryCsv(locale).then(() =>
                setMessage(t("copilotDigestJobsSummaryExportDone"))
              )
            }
          >
            {t("copilotDigestJobsSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-jobs-export"
            onClick={() => void downloadDigestQueuedJobsCsv(locale)}
          >
            {t("copilotDigestJobsExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-job-export"
            disabled={!digestJobs?.items[0]}
            onClick={() => {
              const jobId = digestJobs?.items[0]?.job_id;
              if (!jobId) return;
              void downloadDigestQueuedJobCsv(locale, jobId).then(() =>
                setMessage(t("copilotDigestJobExportDone"))
              );
            }}
          >
            {t("copilotDigestJobExportCsv")}
          </button>
        </div>
      </section>
      <section className="card" data-testid="copilot-digest-dlq">
        <h2>{t("copilotDigestDlqTitle")}</h2>
        <p className="hint" data-testid="copilot-digest-dlq-summary">
          {digestDlq
            ? t("copilotDigestDlqSummary", {
                dead: digestDlq.queue.dead_letter,
                queued: digestDlq.queue.queued,
              })
            : t("copilotDigestDlqLoading")}
        </p>
        <div className="shop-actions">
          <button
            type="button"
            onClick={() =>
              void fetchDigestDeadLetterSummary(locale).then((dlq) =>
                setDigestDlq({ queue: dlq.queue, items: dlq.items })
              )
            }
          >
            {t("copilotDigestDlqRefresh")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-dlq-summary-export"
            onClick={() =>
              void downloadDigestDeadLetterSummaryCsv(locale).then(() =>
                setMessage(t("copilotDigestDlqSummaryExportDone"))
              )
            }
          >
            {t("copilotDigestDlqSummaryExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-dlq-export"
            onClick={() => void downloadDigestDeadLetterCsv(locale)}
          >
            {t("copilotDigestDlqExportCsv")}
          </button>
          <button
            type="button"
            data-testid="copilot-digest-dlq-job-export"
            disabled={!digestDlq?.items[0]}
            onClick={() => {
              const jobId = digestDlq?.items[0]?.job_id;
              if (!jobId) return;
              void downloadDigestDeadLetterJobCsv(locale, jobId).then(() =>
                setMessage(t("copilotDigestDlqJobExportDone"))
              );
            }}
          >
            {t("copilotDigestDlqJobExportCsv")}
          </button>
        </div>
      </section>
      {digestNarrative && (
        <section className="card" data-testid="copilot-digest">
          <h2>{t("copilotDigestTitle")}</h2>
          <p>{digestNarrative}</p>
          {digestEmailStub && (
            <p className="hint" data-testid="digest-email-stub">
              {t("copilotDigestEmailStub")}: {digestEmailStub}
            </p>
          )}
          <div className="shop-actions">
            <button type="button" onClick={() => void loadDigest()}>
              {t("copilotDigestRefresh")}
            </button>
            <button type="button" onClick={() => void runDigestDispatch()}>
              {t("copilotDigestDispatch")}
            </button>
            <button type="button" onClick={() => void runDigestQueue()}>
              {t("copilotDigestQueue")}
            </button>
            <button
              type="button"
              data-testid="copilot-digest-export"
              onClick={() => void downloadAgentDigestCsv(locale)}
            >
              {t("copilotDigestExportCsv")}
            </button>
            <button
              type="button"
              data-testid="copilot-digest-date-export"
              disabled={!digestDate}
              onClick={() => {
                const date = digestDate;
                if (!date) return;
                void downloadAgentDigestDateCsv(locale, date).then(() =>
                  setMessage(t("copilotDigestDateExportDone"))
                );
              }}
            >
              {t("copilotDigestDateExportCsv")}
            </button>
          </div>
        </section>
      )}
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
        <button type="button" onClick={() => void loadContext()}>
          {t("copilotLoadContext")}
        </button>
        {contextSnippet && <p className="highlight">{contextSnippet}</p>}
      </section>

      <section className="card">
        <h2>{t("copilotChatTitle")}</h2>
        <div className="copilot-chat" data-testid="copilot-chat">
          {chatMessages.map((m, idx) => (
            <p key={`${m.created_at}-${idx}`} className={`chat-${m.role}`}>
              <strong>{m.role === "user" ? "You" : "Copilot"}:</strong>{" "}
              {m.content}
            </p>
          ))}
        </div>
        <label>
          <textarea
            rows={2}
            value={chatInput}
            placeholder={t("copilotChatPlaceholder")}
            onChange={(e) => setChatInput(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!sessionId}
          onClick={() => void sendChat()}
        >
          {t("copilotChatSend")}
        </button>
        <button
          type="button"
          data-testid="copilot-session-export"
          disabled={!sessionId}
          onClick={() =>
            sessionId
              ? void downloadCopilotSessionCsv(locale, sessionId).then(() =>
                  setMessage(t("copilotSessionExportDone"))
                )
              : undefined
          }
        >
          {t("copilotSessionExportCsv")}
        </button>
      </section>

      {tools.length > 0 && (
        <section className="card">
          <h2>{t("copilotToolsTitle")}</h2>
          <ul className="tool-catalog">
            {tools.map((tool) => (
              <li key={tool.name}>
                <code>{tool.name}</code> — {tool.mode}: {tool.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>{t("copilotRuleCompile")}</h2>
        <label>
          {t("copilotNlInput")}
          <textarea
            rows={4}
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
          />
        </label>
        <div className="shop-actions">
          <button
            type="button"
            onClick={() => setNlText(t("copilotNlExample"))}
          >
            {t("copilotUseExample")}
          </button>
          <button type="button" onClick={() => void compile()}>
            {t("copilotCompile")}
          </button>
          <button
            type="button"
            disabled={!compileId}
            onClick={() => void confirm()}
          >
            {t("copilotConfirmRule")}
          </button>
        </div>
        {explanation && <p>{explanation}</p>}
        {draftJson && (
          <pre className="draft-preview" data-testid="rule-draft-preview">
            {draftJson}
          </pre>
        )}
      </section>

      <section className="card">
        <h2>{t("copilotAdjustmentDraft")}</h2>
        <label>
          {t("copilotAdjustmentPrice")}
          <input
            type="number"
            value={adjPrice}
            onChange={(e) => setAdjPrice(e.target.value)}
          />
        </label>
        <button type="button" onClick={() => void createAdjustmentDraft()}>
          {t("copilotAdjustmentCreate")}
        </button>
      </section>

      {audit.length > 0 && (
        <section className="card">
          <h2>{t("copilotAuditTitle")}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Summary</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row) => (
                <tr key={row.id}>
                  <td>{row.tool_name}</td>
                  <td>{row.result_summary}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
