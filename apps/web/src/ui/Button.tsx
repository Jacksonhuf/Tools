import type { ButtonProps } from "./types";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, `btn-${size}`, className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...props} />;
}
