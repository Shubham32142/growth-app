"use client";

import {
  Award,
  CheckCircle2,
  Flame,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/cn";

export type StatAccent = "primary" | "streak" | "sky" | "violet";

/**
 * Icons are resolved here (client side) from a plain string key. A Server
 * Component can't pass a Lucide component across the RSC boundary — only
 * serializable props — so the caller passes `icon="flame"`, not the component.
 */
export type StatIcon = "flame" | "award" | "check" | "trending";

const ICONS: Record<StatIcon, LucideIcon> = {
  flame: Flame,
  award: Award,
  check: CheckCircle2,
  trending: TrendingUp,
};

const ACCENT: Record<StatAccent, { text: string; chip: string }> = {
  primary: { text: "text-primary", chip: "bg-primary/10 text-primary ring-primary/20" },
  streak: { text: "text-streak", chip: "bg-streak/10 text-streak ring-streak/20" },
  sky: { text: "text-accent-2", chip: "bg-accent-2/10 text-accent-2 ring-accent-2/20" },
  violet: { text: "text-accent-3", chip: "bg-accent-3/10 text-accent-3 ring-accent-3/20" },
};

/** Splits "12d" / "87%" / "5" into a leading number and a trailing suffix. */
function parseValue(value: string): { num: number; suffix: string } {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { num: NaN, suffix: value };
  return { num: Number(match[1]), suffix: match[2] };
}

export function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: StatIcon;
  label: string;
  value: string;
  accent: StatAccent;
}) {
  const Icon = ICONS[icon];
  const { num, suffix } = parseValue(value);
  const animated = useCountUp(Number.isNaN(num) ? 0 : num);
  const display = Number.isNaN(num) ? value : `${Math.round(animated)}${suffix}`;
  const styles = ACCENT[accent];

  return (
    <Card interactive className="overflow-hidden">
      <CardContent className="flex items-center gap-3 py-4">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            styles.chip,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-3xl font-bold tabular-nums leading-tight", styles.text)}>
            {display}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
