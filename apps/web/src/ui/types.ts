import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export type AlertVariant = "error" | "success" | "warning" | "info";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant: AlertVariant;
  children: ReactNode;
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}
