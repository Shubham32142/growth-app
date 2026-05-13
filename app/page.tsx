import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/motion-fade-up";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/today");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-faint opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-115 w-190 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(52, 211, 153, 0.45), transparent)",
        }}
        aria-hidden
      />

      <FadeUp distance={0} duration={0.4}>
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              GrowthPath
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/sign-in"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </header>
      </FadeUp>

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <FadeUp delay={0.05}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
              <Flame className="h-3 w-3" /> Personal growth, calmly executed
            </span>
          </FadeUp>
          <FadeUp delay={0.12} distance={14}>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Long plans become
              <br />
              <span className="text-primary">small daily wins.</span>
            </h1>
          </FadeUp>
          <FadeUp delay={0.22}>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              GrowthPath serves you today&apos;s tasks from a 6-month plan,
              fetches real beginner-friendly resources for each one, and quietly
              tracks your streak so you actually finish.
            </p>
          </FadeUp>
          <FadeUp delay={0.32}>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Start your plan <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline">
                  I have an account
                </Button>
              </Link>
            </div>
          </FadeUp>
        </section>

        {/* Feature grid */}
        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <CalendarDays className="h-5 w-5" />,
              title: "One day at a time",
              description:
                "Today only. No 24-week wall of tasks staring back at you.",
            },
            {
              icon: <Target className="h-5 w-5" />,
              title: "Grounded resources",
              description:
                "Real, current URLs filtered by AI — never hallucinated.",
            },
            {
              icon: <Flame className="h-5 w-5 text-streak" />,
              title: "Forgiving streaks",
              description:
                "Sundays free. One weekly pardon. Built to keep, not punish.",
            },
            {
              icon: <TrendingUp className="h-5 w-5" />,
              title: "Weekly AI recap",
              description:
                "Every Sunday, see the week through your wins and growth.",
            },
          ].map((f, i) => (
            <FadeUp key={f.title} delay={0.42 + i * 0.06}>
              <FeatureCard
                icon={f.icon}
                title={f.title}
                description={f.description}
              />
            </FadeUp>
          ))}
        </section>

        {/* CTA strip */}
        <FadeUp delay={0.7}>
          <section className="mt-20 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid items-center gap-6 p-8 sm:grid-cols-[1.4fr_1fr] sm:p-10">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Ready to actually finish the plan this time?
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Free during private beta. No credit card. You can delete your
                  account in one click.
                </p>
              </div>
              <div className="flex justify-start sm:justify-end">
                <Link href="/sign-up">
                  <Button size="lg" className="gap-2">
                    Create account <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </FadeUp>

        <footer className="mt-14 text-center text-xs text-muted-foreground">
          Built with care · Quiet by design
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
