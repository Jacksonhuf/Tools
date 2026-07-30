import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ExportPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Collapsible className={cn("mb-4", className)}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {title}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 flex flex-wrap gap-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
