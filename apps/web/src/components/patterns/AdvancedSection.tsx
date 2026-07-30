import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function AdvancedSection({
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
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("mt-8 border-t border-border/50 pt-6", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="mb-2 h-auto w-full justify-between px-0 py-2 hover:bg-transparent"
        >
          <span>
            <span className="block text-sm font-medium">{title}</span>
            {description && (
              <span className="block text-xs font-normal text-muted-foreground">
                {description}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
