import type { AlertProps } from "./types";

const icons: Record<AlertProps["variant"], string> = {
  error: "✕",
  success: "✓",
  warning: "⚠",
  info: "ℹ",
};

export function Alert({
  variant,
  className = "",
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={`alert alert-${variant} ${className}`.trim()}
      {...props}
    >
      <span className="alert-icon" aria-hidden>
        {icons[variant]}
      </span>
      <div className="alert-body">{children}</div>
    </div>
  );
}
