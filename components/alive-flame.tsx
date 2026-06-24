import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The streak flame, alive: a flickering icon over a soft pulsing glow.
 * Pure CSS animation, so it's safe in server or client trees and stills for
 * users who prefer reduced motion.
 */
export function AliveFlame({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-5 w-5 items-center justify-center text-streak",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-streak/40 blur-md animate-flicker"
      />
      <Flame
        aria-hidden
        className="relative h-5 w-5 animate-flicker"
        style={{
          filter: "drop-shadow(0 0 5px color-mix(in oklab, var(--streak) 65%, transparent))",
        }}
      />
    </span>
  );
}
