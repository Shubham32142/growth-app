"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

const COLORS = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--accent-3)",
  "var(--streak)",
];

interface Piece {
  dx: number;
  peak: number;
  fall: number;
  rotate: number;
  color: string;
  w: number;
  h: number;
  delay: number;
}

interface Burst {
  id: number;
  pieces: Piece[];
}

/**
 * Dependency-free celebratory confetti. Increment `trigger` to fire a burst:
 * pieces shoot up from the origin, arc over, then fall and fade. A fixed,
 * pointer-events-none overlay so it never blocks interaction. No-op for users
 * who prefer reduced motion.
 */
export function Confetti({
  trigger,
  count = 60,
  origin = "center",
}: {
  trigger: number;
  count?: number;
  origin?: "center" | "top";
}) {
  const [bursts, setBursts] = React.useState<Burst[]>([]);

  React.useEffect(() => {
    if (!trigger) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const pieces: Piece[] = Array.from({ length: count }, (_, i) => ({
      dx: (Math.random() - 0.5) * 460,
      peak: -(140 + Math.random() * 220),
      fall: 320 + Math.random() * 220,
      rotate: (Math.random() - 0.5) * 720,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      delay: Math.random() * 0.12,
    }));
    const burst: Burst = { id: trigger, pieces };
    // Spawn on the next frame so we don't setState synchronously in the effect.
    const raf = requestAnimationFrame(() =>
      setBursts((prev) => [...prev, burst]),
    );
    const timeout = setTimeout(
      () => setBursts((prev) => prev.filter((b) => b.id !== burst.id)),
      1700,
    );
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [trigger, count]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      <AnimatePresence>
        {bursts.map((burst) =>
          burst.pieces.map((p, i) => (
            <motion.span
              key={`${burst.id}-${i}`}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{
                x: p.dx,
                y: [0, p.peak, p.peak + p.fall],
                rotate: p.rotate,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
                delay: p.delay,
                times: [0, 0.35, 1],
              }}
              style={{
                position: "absolute",
                left: "50%",
                top: origin === "top" ? "26%" : "50%",
                width: p.w,
                height: p.h,
                borderRadius: 2,
                background: p.color,
              }}
            />
          )),
        )}
      </AnimatePresence>
    </div>
  );
}
