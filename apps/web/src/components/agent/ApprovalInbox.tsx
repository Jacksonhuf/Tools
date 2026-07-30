import { useTranslation } from "react-i18next";
import { ArrowRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { cn } from "@/lib/utils";
import type { AdjustmentBatch } from "@/api/client";

export function ApprovalInbox({
  batches,
  onViewAll,
  className,
}: {
  batches: AdjustmentBatch[];
  onViewAll: () => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  if (batches.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 py-12 text-center",
          className
        )}
        data-testid="approval-inbox-empty"
      >
        <Inbox className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("approvalInboxEmpty")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="approval-inbox">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">
          {t("approvalInboxItems", { count: batches.length })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          data-testid="approval-inbox-view-all"
          onClick={onViewAll}
        >
          {t("approvalInboxViewAll")}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-14rem)]">
        <ul className="space-y-2 pr-3">
          {batches.map((batch) => (
            <li
              key={batch.id}
              className="rounded-lg border border-border/60 bg-surface-1 p-3"
              data-testid={`approval-inbox-batch-${batch.id}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-foreground">
                  {batch.id}
                </span>
                <StatusBadge
                  status={batch.status}
                  data-testid={`batch-status-${batch.status}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {batch.reason_code ?? "—"} · {batch.items.length}{" "}
                {t("approvalInboxListings")}
              </p>
              <time
                className="mt-1 block text-[10px] text-muted-foreground/80"
                dateTime={batch.created_at}
              >
                {new Date(batch.created_at).toLocaleString(locale)}
              </time>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
