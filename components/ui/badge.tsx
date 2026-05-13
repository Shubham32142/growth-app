import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-border bg-secondary text-muted-foreground",
        accent:
          "border-primary/40 bg-primary/10 text-primary",
        streak:
          "border-streak/40 bg-streak/10 text-streak",
        danger:
          "border-destructive/40 bg-destructive/10 text-destructive",
        outline:
          "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
