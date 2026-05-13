import * as React from "react";
import { cn } from "@/lib/cn";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
}

function initialsFor(name?: string | null, email?: string | null) {
  const source = (name ?? email ?? "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

const sizeClasses = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export function Avatar({
  name,
  email,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-semibold text-foreground",
        sizeClasses[size],
        className,
      )}
      aria-hidden
      {...props}
    >
      {initialsFor(name, email)}
    </div>
  );
}
