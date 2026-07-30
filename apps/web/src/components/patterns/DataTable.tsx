import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/primitives/Surface";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DataTable({
  children,
  className,
  testId,
  filter,
  onFilterChange,
  filterPlaceholder,
  toolbar,
  isEmpty,
  emptyMessage,
  loading,
  maxHeight = 480,
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
  filter?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  toolbar?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  maxHeight?: number | false;
}) {
  const showToolbar = filter !== undefined || toolbar;

  return (
    <Surface
      variant="inset"
      padding="none"
      className={cn("overflow-hidden", className)}
      data-testid={testId}
    >
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
          {filter !== undefined && onFilterChange && (
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                placeholder={filterPlaceholder}
                className="h-8 border-border/60 bg-surface-1 pl-8 text-sm"
                data-testid={testId ? `${testId}-filter` : undefined}
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {loading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-md bg-surface-3/80"
            />
          ))}
        </div>
      ) : isEmpty ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div
          className={cn("relative overflow-auto")}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {children}
        </div>
      )}
    </Surface>
  );
}

export function DataTableRow({
  selected,
  onClick,
  actions,
  children,
  className,
  ...props
}: {
  selected?: boolean;
  onClick?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <TableRow
      className={cn(
        "group h-10 border-border/40 transition-colors",
        onClick && "cursor-pointer",
        selected && "bg-primary/10 hover:bg-primary/12",
        className
      )}
      onClick={onClick}
      data-state={selected ? "selected" : undefined}
      {...props}
    >
      {children}
      {actions && (
        <TableCell className="w-0 p-0 pr-2">
          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {actions}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export {
  Table as DataTableRoot,
  TableHeader as DataTableHeader,
  TableBody as DataTableBody,
  TableHead as DataTableHead,
  TableCell as DataTableCell,
  TableRow,
};

/** Client-side filter helper for simple row matching */
export function matchDataTableFilter(
  filter: string,
  ...values: Array<string | number | null | undefined>
): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? "").toLowerCase().includes(q));
}
