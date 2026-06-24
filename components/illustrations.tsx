import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Hand-drawn animated SVG illustrations — the stem draws itself, leaves pop in,
 * and accent sparkles float. Used to give empty / rest states personality
 * instead of a bare line of text. Pure CSS animation (see globals.css), so
 * these render fine in server components and respect prefers-reduced-motion.
 */

export function SproutIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className={cn("text-primary", className)}
    >
      {/* soft glow */}
      <circle cx="60" cy="62" r="36" fill="currentColor" opacity={0.06} />
      {/* mound */}
      <path
        d="M26 94 Q60 82 94 94"
        stroke="var(--border)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* stem (draws itself) */}
      <path
        d="M60 94 C60 80 60 72 60 54"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="draw-path"
        style={{ "--len": "44" } as React.CSSProperties}
      />
      {/* left leaf */}
      <path
        d="M60 72 C45 73 38 63 37 53 C49 53 60 60 60 72 Z"
        fill="currentColor"
        opacity={0.85}
        className="animate-pop-in"
        style={{ animationDelay: "0.7s" }}
      />
      {/* right leaf */}
      <path
        d="M60 64 C75 65 82 55 83 45 C71 45 60 52 60 64 Z"
        fill="currentColor"
        className="animate-pop-in"
        style={{ animationDelay: "0.95s" }}
      />
      {/* floating sparkles */}
      <circle
        cx="88"
        cy="42"
        r="2.6"
        className="animate-float"
        style={{ fill: "var(--accent-2)", animationDelay: "0.2s" }}
      />
      <circle
        cx="33"
        cy="46"
        r="2"
        className="animate-float"
        style={{ fill: "var(--accent-3)", animationDelay: "1s" }}
      />
      <circle
        cx="92"
        cy="62"
        r="1.8"
        className="animate-float"
        style={{ fill: "var(--streak)", animationDelay: "0.6s" }}
      />
    </svg>
  );
}

export function RestDayIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      className={cn("text-streak", className)}
    >
      <circle cx="60" cy="60" r="36" fill="currentColor" opacity={0.06} />
      {/* crescent moon — overlaying a card-coloured circle carves the crescent */}
      <g className="animate-float">
        <circle cx="58" cy="58" r="24" fill="currentColor" />
        <circle cx="69" cy="51" r="20" fill="var(--card)" />
      </g>
      {/* twinkling stars */}
      <circle
        cx="40"
        cy="40"
        r="2.4"
        className="animate-flicker"
        style={{ fill: "var(--accent-3)", animationDelay: "0.1s" }}
      />
      <circle
        cx="48"
        cy="84"
        r="1.8"
        className="animate-flicker"
        style={{ fill: "var(--accent-2)", animationDelay: "0.6s" }}
      />
      <circle
        cx="88"
        cy="86"
        r="2"
        className="animate-flicker"
        style={{ fill: "var(--accent-3)", animationDelay: "0.9s" }}
      />
    </svg>
  );
}
