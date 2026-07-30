import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Surface } from "@/components/primitives/Surface";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ExportHub({
  title,
  description,
  children,
  className,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <Surface variant="inset" padding="none" className={cn("overflow-hidden", className)}>
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3 hover:bg-surface-3/50"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Download className="h-4 w-4 text-muted-foreground" />
              {title}
            </span>
            <span className="text-xs text-muted-foreground">
              {description}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/50 px-4 py-3">
          <div className="flex flex-wrap gap-2">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Surface>
  );
}
