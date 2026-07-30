import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/primitives/Surface";

export function FormSection({
  title,
  description,
  children,
  className,
  testId,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Surface
      variant="elevated"
      padding="none"
      className={cn("mb-4 overflow-hidden", className)}
      data-testid={testId}
    >
      <div className="border-b border-border/50 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </Surface>
  );
}

export function FormField({
  label,
  htmlFor,
  description,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormRow({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  const gridClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-4", gridClass, className)}>{children}</div>
  );
}

export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border/40 pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FormInset({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface-2/80 p-4 ring-1 ring-border/40",
        className
      )}
    >
      {children}
    </div>
  );
}
