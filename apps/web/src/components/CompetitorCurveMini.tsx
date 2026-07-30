export interface CompetitorCurvePoint {
  date: string;
  avg_effective_mxn: number;
}

interface Props {
  points: CompetitorCurvePoint[];
  title: string;
  formatAmount: (n: number) => string;
}

export function CompetitorCurveMini({ points, title, formatAmount }: Props) {
  if (points.length === 0) {
    return null;
  }

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((p) => p.avg_effective_mxn);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 200;
  const height = 48;
  const padding = 4;

  const coords = sorted.map((point, index) => {
    const x =
      padding +
      (index / Math.max(sorted.length - 1, 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((point.avg_effective_mxn - min) / span) * (height - padding * 2);
    return { x, y, point };
  });

  const polyline = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const latest = sorted[sorted.length - 1];

  return (
    <div className="space-y-1" data-testid="competitor-curve-mini">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{title}</span>
        <span className="font-medium tabular-nums">
          {formatAmount(latest.avg_effective_mxn)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-12 w-full text-primary"
        role="img"
        aria-label={title}
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {coords.map(({ x, y, point }) => (
          <circle
            key={point.date}
            cx={x}
            cy={y}
            r="2.5"
            fill="currentColor"
          />
        ))}
      </svg>
    </div>
  );
}
