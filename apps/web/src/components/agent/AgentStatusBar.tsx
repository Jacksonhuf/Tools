import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "./AgentContext";

const STATUS_CONFIG: Record<
  AgentStatus,
  { labelKey: string; dotClass: string; testId: string }
> = {
  idle: {
    labelKey: "agentStatusIdle",
    dotClass: "bg-success",
    testId: "agent-status-idle",
  },
  running: {
    labelKey: "agentStatusRunning",
    dotClass: "bg-primary animate-pulse",
    testId: "agent-status-running",
  },
  needs_approval: {
    labelKey: "agentStatusNeedsApproval",
    dotClass: "bg-warning",
    testId: "agent-status-needs_approval",
  },
};

export function AgentStatusBar({
  status,
  pendingCount,
  onClick,
  className,
}: {
  status: AgentStatus;
  pendingCount?: number;
  onClick?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hidden items-center gap-1.5 rounded-md border border-border/50 bg-surface-2 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground sm:flex",
        className
      )}
      data-testid={config.testId}
      aria-label={t("agentPanelOpen")}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      <span>{t(config.labelKey)}</span>
      {status === "needs_approval" && pendingCount != null && pendingCount > 0 && (
        <span className="rounded bg-warning/15 px-1 py-0.5 text-[10px] font-medium text-warning">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
