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
  fetchDigestSchedule,
  fetchDigestDeadLetterSummary,
  fetchDigestQueuedJobsSummary,
  downloadCopilotSessionCsv,
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
import { CopilotChatPanel } from "./CopilotChatPanel";
import { CopilotExportHub } from "./CopilotExportHub";
import { PageIntent } from "@/components/patterns/PageIntent";
import { AdvancedSection } from "@/components/patterns/AdvancedSection";
import { Surface } from "@/components/primitives/Surface";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRoot,
  DataTableRow,
} from "@/components/patterns/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="space-y-4">
      <PageIntent title={t("copilotTitle")} description={t("copilotHint")} />
      {p4Ready != null && (
        <p className="text-sm text-muted-foreground" data-testid="p4-readiness">
          P4: {p4Ready ? t("copilotP4Ready") : t("copilotP4NotReady")}
        </p>
      )}
      {compilerLabel && (
        <p className="text-sm text-muted-foreground" data-testid="compiler-status">
          {t("copilotCompilerStatus")}: {compilerLabel}
        </p>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="copilot-digest-schedule">
        <h2 className="text-base font-semibold">{t("copilotDigestScheduleTitle")}</h2>
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
        <p className="text-sm text-muted-foreground">
          {t("copilotDigestLastDispatch")}:{" "}
          {digestLastRun ? new Date(digestLastRun).toLocaleString(locale) : "—"}
        </p>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </Surface>
      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="copilot-digest-jobs">
        <h2 className="text-base font-semibold">{t("copilotDigestJobsTitle")}</h2>
        <p className="text-sm text-muted-foreground" data-testid="copilot-digest-jobs-summary">
          {digestJobs
            ? t("copilotDigestJobsSummary", {
                queued: digestJobs.queue.queued,
                failed: digestJobs.queue.failed,
                dead: digestJobs.queue.dead_letter,
              })
            : t("copilotDigestJobsLoading")}
        </p>
      </Surface>
      <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="copilot-digest-dlq">
        <h2 className="text-base font-semibold">{t("copilotDigestDlqTitle")}</h2>
        <p className="text-sm text-muted-foreground" data-testid="copilot-digest-dlq-summary">
          {digestDlq
            ? t("copilotDigestDlqSummary", {
                dead: digestDlq.queue.dead_letter,
                queued: digestDlq.queue.queued,
              })
            : t("copilotDigestDlqLoading")}
        </p>
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
      </Surface>
      {digestNarrative && (
        <Surface variant="elevated" padding="md" className="mb-4 space-y-4" data-testid="copilot-digest">
          <h2 className="text-base font-semibold">{t("copilotDigestTitle")}</h2>
          <p>{digestNarrative}</p>
          {digestEmailStub && (
            <p className="text-sm text-muted-foreground" data-testid="digest-email-stub">
              {t("copilotDigestEmailStub")}: {digestEmailStub}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadDigest()}>
              {t("copilotDigestRefresh")}
            </button>
            <button type="button" onClick={() => void runDigestDispatch()}>
              {t("copilotDigestDispatch")}
            </button>
            <button type="button" onClick={() => void runDigestQueue()}>
              {t("copilotDigestQueue")}
            </button>
          </div>
        </Surface>
      )}

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4">
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
        {contextSnippet && <p className="text-2xl font-bold text-primary">{contextSnippet}</p>}
      </Surface>

      <CopilotChatPanel
        title={t("copilotChatTitle")}
        messages={chatMessages}
        chatInput={chatInput}
        placeholder={t("copilotChatPlaceholder")}
        sendLabel={t("copilotChatSend")}
        exportLabel={t("copilotSessionExportCsv")}
        sessionId={sessionId}
        onInputChange={setChatInput}
        onSend={() => void sendChat()}
        onExport={() => {
          if (!sessionId) return;
          void downloadCopilotSessionCsv(locale, sessionId).then(() =>
            setMessage(t("copilotSessionExportDone"))
          );
        }}
      />

      {tools.length > 0 && (
        <Surface variant="elevated" padding="md" className="mb-4 space-y-4">
          <h2 className="text-base font-semibold">{t("copilotToolsTitle")}</h2>
          <ul className="m-0 list-none space-y-2 p-0">
            {tools.map((tool) => (
              <li key={tool.name} className="rounded-md border bg-muted/30 p-3 text-sm">
                <code>{tool.name}</code> — {tool.mode}: {tool.description}
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4">
        <h2 className="text-base font-semibold">{t("copilotRuleCompile")}</h2>
        <label>
          {t("copilotNlInput")}
          <textarea
            rows={4}
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
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
          <pre className="mt-3 overflow-x-auto rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-100" data-testid="rule-draft-preview">
            {draftJson}
          </pre>
        )}
      </Surface>

      <Surface variant="elevated" padding="md" className="mb-4 space-y-4">
        <h2 className="text-base font-semibold">{t("copilotAdjustmentDraft")}</h2>
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
      </Surface>

      {audit.length > 0 && (
        <Surface variant="elevated" padding="md" className="mb-4 space-y-4">
          <h2 className="text-base font-semibold">{t("copilotAuditTitle")}</h2>
          <DataTable testId="copilot-audit-table" maxHeight={320}>
            <DataTableRoot>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>Tool</DataTableHead>
                  <DataTableHead>Summary</DataTableHead>
                  <DataTableHead>Time</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {audit.map((row) => (
                  <DataTableRow key={row.id}>
                    <DataTableCell className="font-mono text-xs">{row.tool_name}</DataTableCell>
                    <DataTableCell>{row.result_summary}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {new Date(row.created_at).toLocaleString(locale)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTableRoot>
          </DataTable>
        </Surface>
      )}

      <AdvancedSection title={t("advancedSection")} description={t("exportHubHint")}>
        <CopilotExportHub
          locale={locale}
          listingId={listingId}
          t={t}
          setMessage={setMessage}
          firstReadinessCheckId={firstReadinessCheckId}
          tools={tools}
          audit={audit}
          lastDispatchJobId={lastDispatchJobId}
          digestJobs={digestJobs}
          digestDlq={digestDlq}
          digestDate={digestDate}
        />
      </AdvancedSection>
    </div>
  );
}
