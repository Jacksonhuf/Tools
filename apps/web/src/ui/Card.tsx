import type { ReactNode } from "react";
import type { CardProps } from "./types";

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <section className={`card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div>
        <h2 className="card-title">{title}</h2>
        {description && <p className="card-desc">{description}</p>}
      </div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
}
