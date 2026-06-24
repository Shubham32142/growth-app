import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db/client";
import { completions, energyLogs, tasks } from "@/lib/db/schema";
import { currentWeekFromPlan, requireActivePlan } from "@/lib/plan";
import { computeStreak } from "@/lib/streak";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeUp } from "@/components/motion-fade-up";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "./StatCard";
import Heatmap from "./Heatmap";
import EnergyChart from "./EnergyChart";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const plan = await requireActivePlan(userId);
  const week = currentWeekFromPlan(plan);

  const [userCompletions, totalCountRow, weekTaskRows, tasksThisWeekRow] =
    await Promise.all([
      db
        .select()
        .from(completions)
        .where(
          and(
            eq(completions.userId, userId),
            eq(completions.planId, plan.id),
          ),
        ),
      db
        .select({ total: count() })
        .from(tasks)
        .where(eq(tasks.planId, plan.id)),
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.planId, plan.id), eq(tasks.weekNumber, week)),
        ),
      db
        .select({ total: count() })
        .from(tasks)
        .where(
          and(eq(tasks.planId, plan.id), eq(tasks.weekNumber, week)),
        ),
    ]);

  const totalTasks = totalCountRow[0]?.total ?? 0;
  const weekTaskIds = weekTaskRows.map((t) => t.id);
  const weekEnergyLogs =
    weekTaskIds.length > 0
      ? await db
          .select()
          .from(energyLogs)
          .where(
            and(
              eq(energyLogs.userId, userId),
              inArray(energyLogs.taskId, weekTaskIds),
            ),
          )
      : [];

  const completionDates = userCompletions.map((c) => c.completedAt);
  const { currentStreak, longestStreak } = computeStreak(completionDates);

  const totalDone = userCompletions.length;
  const overallPct =
    totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const doneThisWeek = userCompletions.filter(
    (c) => c.weekNumber === week,
  ).length;
  const tasksThisWeek = tasksThisWeekRow[0]?.total ?? 0;
  const weekPct =
    tasksThisWeek > 0 ? Math.round((doneThisWeek / tasksThisWeek) * 100) : 0;

  const dayBuckets = new Map<string, { total: number; count: number }>();
  for (const log of weekEnergyLogs) {
    const key = log.at.toISOString().slice(0, 10);
    const bucket = dayBuckets.get(key) ?? { total: 0, count: 0 };
    bucket.total += log.rating;
    bucket.count += 1;
    dayBuckets.set(key, bucket);
  }

  const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const energyData = Array.from(dayBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      day: weekdayFmt.format(new Date(date)),
      avg: Number((bucket.total / bucket.count).toFixed(2)),
    }));

  const countByDay = new Map<string, number>();
  for (const c of userCompletions) {
    const key = c.completedAt.toISOString().slice(0, 10);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }
  const heatmapCells = Array.from(countByDay.entries()).map(([date, count]) => ({
    date,
    count,
  }));
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="accent">Week {week} of {plan.durationWeeks}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Progress
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How the long plan is unfolding, one small win at a time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/recap/${week}`}>
            <Button variant="streak" size="sm">
              <Sparkles className="h-3.5 w-3.5" /> Week recap
            </Button>
          </Link>
          <Link href="/today">
            <Button variant="outline" size="sm">
              Back to today
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: "flame" as const,
            label: "Current streak",
            value: `${currentStreak}d`,
            accent: "streak" as const,
          },
          {
            icon: "award" as const,
            label: "Longest streak",
            value: `${longestStreak}d`,
            accent: "violet" as const,
          },
          {
            icon: "check" as const,
            label: "Total complete",
            value: `${totalDone}`,
            accent: "primary" as const,
          },
          {
            icon: "trending" as const,
            label: "Overall",
            value: `${overallPct}%`,
            accent: "sky" as const,
          },
        ].map((stat, idx) => (
          <FadeUp key={stat.label} delay={0.04 * idx}>
            <StatCard
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              accent={stat.accent}
            />
          </FadeUp>
        ))}
      </div>

      {/* Week + overall progress */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FadeUp delay={0.18}>
          <Card interactive>
            <CardHeader>
              <CardTitle>This week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-3xl font-bold tabular-nums">{weekPct}%</span>
                <span className="text-xs text-muted-foreground">
                  {doneThisWeek}/{tasksThisWeek} tasks
                </span>
              </div>
              <Progress value={weekPct} />
            </CardContent>
          </Card>
        </FadeUp>
        <FadeUp delay={0.22}>
          <Card interactive>
            <CardHeader>
              <CardTitle>Overall plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-3xl font-bold tabular-nums">{overallPct}%</span>
                <span className="text-xs text-muted-foreground">
                  {totalDone}/{totalTasks} tasks
                </span>
              </div>
              <Progress value={overallPct} />
            </CardContent>
          </Card>
        </FadeUp>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity — {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap cells={heatmapCells} year={currentYear} />
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Less</span>
            {["var(--surface-2)", "#065f46", "#059669", "var(--accent)"].map(
              (c, i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-sm"
                  style={{ background: c }}
                />
              ),
            )}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </CardContent>
      </Card>

      {/* Energy */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly energy</CardTitle>
        </CardHeader>
        <CardContent>
          {energyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No energy ratings logged this week yet. Rate yourself as you mark
              tasks complete.
            </p>
          ) : (
            <EnergyChart data={energyData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
