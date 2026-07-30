import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AgentToolAuditItem } from "./AgentContext";

export function TaskTimeline({
  items,
  className,
}: {
  items: AgentToolAuditItem[];
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  if (items.length === 0) {
    return (
      <p
        className={cn("py-8 text-center text-sm text-muted-foreground", className)}
        data-testid="task-timeline-empty"
      >
        {t("taskTimelineEmpty")}
      </p>
    );
  }

  return (
    <ScrollArea className={cn("h-[calc(100vh-12rem)]", className)}>
      <ol
        className="relative space-y-0 px-1"
        data-testid="task-timeline"
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            className="relative flex gap-3 pb-5 pl-6 last:pb-2"
            data-testid={`task-timeline-item-${item.id}`}
          >
            {index < items.length - 1 && (
              <span
                className="absolute left-[11px] top-6 h-full w-px bg-border/60"
                aria-hidden
              />
            )}
            <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-surface-3">
              <Wrench className="h-3 w-3 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-mono text-xs font-medium text-foreground">
                {item.tool_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.result_summary}
              </p>
              <time
                className="text-[10px] text-muted-foreground/80"
                dateTime={item.created_at}
              >
                {new Date(item.created_at).toLocaleString(locale)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
