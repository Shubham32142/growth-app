"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, className, indicatorClassName, ...props }, ref) => {
    const safe = Math.min(100, Math.max(0, value));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-secondary",
          className,
        )}
        {...props}
      >
        <motion.div
          className={cn(
            "relative h-full overflow-hidden rounded-full bg-primary",
            indicatorClassName,
          )}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {safe > 0 && (
            <span aria-hidden className="absolute inset-0 bar-sheen" />
          )}
        </motion.div>
      </div>
    );
  },
);
Progress.displayName = "Progress";
