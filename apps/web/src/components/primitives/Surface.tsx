import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("rounded-lg text-card-foreground", {
  variants: {
    variant: {
      elevated: "bg-surface-1 shadow-sm ring-1 ring-border/60",
      inset: "bg-surface-2 ring-1 ring-border/40",
      ghost: "bg-transparent",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    },
    interactive: {
      true: "cursor-pointer transition-shadow hover:shadow-md",
      false: "",
    },
  },
  defaultVariants: {
    variant: "elevated",
    padding: "md",
    interactive: false,
  },
});

export interface SurfaceProps
  extends Omit<HTMLMotionProps<"div">, "children">,
    VariantProps<typeof surfaceVariants> {
  children?: React.ReactNode;
  animateHover?: boolean;
}

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      className,
      variant,
      padding,
      interactive,
      animateHover = false,
      children,
      ...props
    },
    ref
  ) => (
    <motion.div
      ref={ref}
      className={cn(surfaceVariants({ variant, padding, interactive }), className)}
      whileHover={animateHover ? { y: -2, transition: { duration: 0.15 } } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
);
Surface.displayName = "Surface";

export { Surface, surfaceVariants };
