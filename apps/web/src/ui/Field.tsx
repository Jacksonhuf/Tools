import type { FieldProps } from "./types";

export function Field({ label, hint, htmlFor, children, className = "" }: FieldProps) {
  return (
    <label className={`field ${className}`.trim()} htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      <div className="field-control">{children}</div>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
