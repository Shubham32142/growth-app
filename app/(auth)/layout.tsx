import type { ReactNode } from "react";
import Link from "next/link";
import { Flame, Sparkles, Target } from "lucide-react";
import { FadeUp } from "@/components/motion-fade-up";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-faint opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-105 w-170 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #34d39955, transparent)" }}
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-stretch px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-16">
        {/* Left: form */}
        <div className="flex flex-col">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 self-start"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              GrowthPath
            </span>
          </Link>

          <FadeUp
            delay={0.08}
            distance={14}
            className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center"
          >
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20">
              {children}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Free, private beta · Calm by default
            </p>
          </FadeUp>
        </div>

        {/* Right: marketing panel */}
        <aside className="hidden flex-col justify-center lg:flex">
          <div className="space-y-8">
            <FadeUp delay={0.15}>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
                <Flame className="h-3 w-3" /> 6-month dev plan inside
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Show up. Every day.
                <br />
                <span className="text-muted-foreground">
                  We&apos;ll handle the rest.
                </span>
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                GrowthPath turns a long-term plan into a quiet daily checklist,
                fetches real beginner-friendly resources for each task, and
                celebrates your week with an AI-generated recap.
              </p>
            </FadeUp>

            <div className="space-y-3 text-sm">
              {[
                {
                  icon: <Target className="h-4 w-4" />,
                  title: "One screen per day",
                  description: "Just today's tasks, grouped by focus area.",
                },
                {
                  icon: <Flame className="h-4 w-4 text-streak" />,
                  title: "Forgiving streaks",
                  description:
                    "Sundays free. One weekly pardon. No guilt loops.",
                },
                {
                  icon: <Sparkles className="h-4 w-4" />,
                  title: "Grounded resources",
                  description: "Real, current URLs — never hallucinated.",
                },
              ].map((row, i) => (
                <FadeUp key={row.title} delay={0.28 + i * 0.07}>
                  <FeatureRow
                    icon={row.icon}
                    title={row.title}
                    description={row.description}
                  />
                </FadeUp>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
