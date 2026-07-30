import type { HTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { statusBadgeVariant } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
  ...props
}: {
  status: string;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge
      variant={statusBadgeVariant(status)}
      className={cn("normal-case tracking-normal", className)}
      {...props}
    >
      {status}
    </Badge>
  );
}
