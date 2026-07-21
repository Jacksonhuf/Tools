import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  compileDynamicRule,
  confirmCompiledDynamicRule,
  createCopilotSession,
  DEMO_SKU,
  fetchAgentToolAudit,
  fetchAgentTools,
  fetchRuleCompilerStatus,
  invokeAgentTool,
  LISTING_BY_CHANNEL,
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

  const selected = LISTINGS.find((l) => l.id === listingId)!;

  useEffect(() => {
    setNlText(t("copilotNlExample"));
  }, [locale, t]);

  useEffect(() => {
    void (async () => {
      try {
        const s = await createCopilotSession(locale, listingId, DEMO_SKU);
        setSessionId(s.session_id);
        setChatMessages([]);
      } catch {
        setSessionId(null);
      }
    })();
  }, [locale, listingId]);

  const refreshAudit = async () => {
    const out = await fetchAgentToolAudit(locale, 15);
    setAudit(out.items);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [toolRes, status] = await Promise.all([
          fetchAgentTools(locale),
          fetchRuleCompilerStatus(locale),
        ]);
        setTools(toolRes.items);
        setCompilerLabel(`${status.driver} — ${status.note}`);
        await refreshAudit();
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
      {compilerLabel && (
        <p className="hint" data-testid="compiler-status">
          {t("copilotCompilerStatus")}: {compilerLabel}
        </p>
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
