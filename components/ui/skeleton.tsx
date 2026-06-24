import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Shaped loading placeholder with a shimmer sweep (see `.skeleton` in
 * globals.css). Set width/height/radius via className.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}
