import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  createCopilotSession,
  DEMO_SKU,
  downloadCopilotSessionCsv,
  fetchAdjustmentBatches,
  fetchAgentToolAudit,
  LISTING_BY_CHANNEL,
  sendCopilotMessage,
  type AdjustmentBatch,
  type CopilotChatMessage,
} from "@/api/client";
import type { AppTab } from "@/components/layout/types";

export type AgentStatus = "idle" | "running" | "needs_approval";

export type AgentToolAuditItem = {
  id: string;
  tool_name: string;
  result_summary: string;
  created_at: string;
};

type AgentContextValue = {
  status: AgentStatus;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  sessionId: string | null;
  chatMessages: CopilotChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChat: () => Promise<void>;
  exportSession: () => Promise<void>;
  auditItems: AgentToolAuditItem[];
  refreshAudit: () => Promise<void>;
  pendingBatches: AdjustmentBatch[];
  refreshPendingBatches: () => Promise<void>;
  navigateToAdjustments: () => void;
  isSending: boolean;
};

const AgentContext = createContext<AgentContextValue | null>(null);

const DEFAULT_LISTING_ID = LISTING_BY_CHANNEL.MERCADO_LIBRE;

export function AgentProvider({
  onTabChange,
  children,
}: {
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const [panelOpen, setPanelOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<CopilotChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [auditItems, setAuditItems] = useState<AgentToolAuditItem[]>([]);
  const [pendingBatches, setPendingBatches] = useState<AdjustmentBatch[]>([]);

  const refreshAudit = useCallback(async () => {
    try {
      const out = await fetchAgentToolAudit(locale, 20);
      setAuditItems(out.items);
    } catch {
      setAuditItems([]);
    }
  }, [locale]);

  const refreshPendingBatches = useCallback(async () => {
    try {
      const out = await fetchAdjustmentBatches(locale);
      setPendingBatches(
        out.items.filter((batch) => batch.status === "pending_approval")
      );
    } catch {
      setPendingBatches([]);
    }
  }, [locale]);

  useEffect(() => {
    void (async () => {
      try {
        const session = await createCopilotSession(
          locale,
          DEFAULT_LISTING_ID,
          DEMO_SKU,
          "MERCADO_LIBRE",
          true
        );
        setSessionId(session.session_id);
        setChatMessages(session.messages ?? []);
      } catch {
        setSessionId(null);
        setChatMessages([]);
      }
    })();
  }, [locale]);

  useEffect(() => {
    void refreshAudit();
    void refreshPendingBatches();
  }, [refreshAudit, refreshPendingBatches]);

  const sendChat = useCallback(async () => {
    if (!sessionId || !chatInput.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await sendCopilotMessage(
        locale,
        sessionId,
        DEFAULT_LISTING_ID,
        chatInput.trim()
      );
      setChatMessages(res.messages);
      setChatInput("");
      await refreshAudit();
      await refreshPendingBatches();
    } finally {
      setIsSending(false);
    }
  }, [
    sessionId,
    chatInput,
    isSending,
    locale,
    refreshAudit,
    refreshPendingBatches,
  ]);

  const exportSession = useCallback(async () => {
    if (!sessionId) return;
    await downloadCopilotSessionCsv(locale, sessionId);
  }, [locale, sessionId]);

  const navigateToAdjustments = useCallback(() => {
    setPanelOpen(false);
    onTabChange("adjustments");
  }, [onTabChange]);

  const status: AgentStatus = useMemo(() => {
    if (isSending) return "running";
    if (pendingBatches.length > 0) return "needs_approval";
    return "idle";
  }, [isSending, pendingBatches.length]);

  const value = useMemo<AgentContextValue>(
    () => ({
      status,
      panelOpen,
      setPanelOpen,
      togglePanel: () => setPanelOpen((open) => !open),
      sessionId,
      chatMessages,
      chatInput,
      setChatInput,
      sendChat,
      exportSession,
      auditItems,
      refreshAudit,
      pendingBatches,
      refreshPendingBatches,
      navigateToAdjustments,
      isSending,
    }),
    [
      status,
      panelOpen,
      sessionId,
      chatMessages,
      chatInput,
      sendChat,
      exportSession,
      auditItems,
      refreshAudit,
      pendingBatches,
      refreshPendingBatches,
      navigateToAdjustments,
      isSending,
    ]
  );

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgent must be used within AgentProvider");
  }
  return ctx;
}
