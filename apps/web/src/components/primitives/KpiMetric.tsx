import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "./Surface";

export function KpiMetric({
  label,
  value,
  trend,
  trendDirection = "neutral",
  className,
  "data-testid": testId,
}: {
  label: string;
  value: ReactNode;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <Surface
      variant="inset"
      padding="sm"
      className={cn("min-w-[140px]", className)}
      data-testid={testId}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "mt-1 text-xs",
            trendDirection === "up" && "text-success",
            trendDirection === "down" && "text-destructive",
            trendDirection === "neutral" && "text-muted-foreground"
          )}
        >
          {trend}
        </p>
      )}
    </Surface>
  );
}
