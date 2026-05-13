import { NextRequest, NextResponse } from "next/server";
import { and, asc, avg, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  completions,
  energyLogs,
  planWeeks,
  plans,
  tasks,
} from "@/lib/db/schema";
import { generateWeekTasks } from "@/lib/ai";
import { currentWeekFromPlan } from "@/lib/plan";

/**
 * Cron job — generates next week's tasks for every active plan whose
 * upcoming week isn't yet populated.
 *
 * Triggered by Vercel Cron every Sunday evening (see vercel.json).
 *
 * Auth: Vercel calls cron URLs with `Authorization: Bearer $CRON_SECRET`
 * if the env var is set. We honour that. Locally you can hit it with
 * `curl -H "authorization: bearer $CRON_SECRET" http://localhost:3000/api/cron/weekly-regen`.
 *
 * Pattern: this endpoint runs queries that span MANY users so it relies on
 * the Drizzle client which uses the pooled service connection. RLS is
 * effectively bypassed because the service role (set in DATABASE_URL on
 * Vercel) is `postgres` which has BYPASSRLS.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth.toLowerCase() !== `bearer ${cronSecret}`.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const activePlans = await db
    .select()
    .from(plans)
    .where(and(eq(plans.status, "active"), eq(plans.source, "ai-generated")));

  const results: Array<{
    planId: string;
    weekNumber: number;
    status: "generated" | "skipped" | "failed";
    error?: string;
  }> = [];

  for (const plan of activePlans) {
    const currentWeek = currentWeekFromPlan(plan);
    const targetWeek = currentWeek + 1;

    if (targetWeek > plan.durationWeeks) {
      continue; // plan is in its final week or beyond
    }

    if (
      !plan.topic ||
      !plan.currentLevel ||
      plan.hoursPerDay === null ||
      plan.learningStyle === null
    ) {
      continue; // missing wizard inputs — likely template plan or corrupt row
    }

    const [planWeek] = await db
      .select()
      .from(planWeeks)
      .where(
        and(
          eq(planWeeks.planId, plan.id),
          eq(planWeeks.weekNumber, targetWeek),
        ),
      )
      .limit(1);
    if (!planWeek) continue;
    if (planWeek.tasksGeneratedAt) {
      results.push({
        planId: plan.id,
        weekNumber: targetWeek,
        status: "skipped",
      });
      continue;
    }

    try {
      const adjustmentNotes = await buildAdjustmentNotes({
        userId: plan.userId,
        planId: plan.id,
        prevWeek: currentWeek,
      });

      const generated = await generateWeekTasks({
        weekTheme: planWeek.theme,
        weekGoal: planWeek.goal,
        weekNumber: targetWeek,
        monthNumber: planWeek.monthNumber,
        topic: plan.topic,
        currentLevel: plan.currentLevel,
        hoursPerDay: plan.hoursPerDay,
        learningStyle: plan.learningStyle,
        adjustmentNotes,
      });

      const nextVersion = planWeek.generationVersion + 1;
      await db.transaction(async (tx) => {
        await tx.delete(tasks).where(eq(tasks.planWeekId, planWeek.id));

        await tx.insert(tasks).values(
          generated.tasks.map((t, idx) => ({
            planId: plan.id,
            planWeekId: planWeek.id,
            weekNumber: targetWeek,
            monthNumber: planWeek.monthNumber,
            section: t.section,
            title: t.title,
            body: t.body,
            category: t.category,
            order: idx,
            estimatedMinutes: t.estimatedMinutes,
            generationVersion: nextVersion,
          })),
        );

        await tx
          .update(planWeeks)
          .set({
            generationVersion: nextVersion,
            tasksGeneratedAt: new Date(),
            adjustmentNotes: adjustmentNotes ?? null,
            updatedAt: new Date(),
          })
          .where(eq(planWeeks.id, planWeek.id));
      });

      results.push({
        planId: plan.id,
        weekNumber: targetWeek,
        status: "generated",
      });
    } catch (err) {
      console.error(
        `[cron/weekly-regen] plan=${plan.id} week=${targetWeek} failed:`,
        err,
      );
      results.push({
        planId: plan.id,
        weekNumber: targetWeek,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    generated: results.filter((r) => r.status === "generated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}

/**
 * Allow GET too so the cron platform can hit it without POST support.
 * Vercel Cron actually uses GET by default.
 */
export const GET = POST;

async function buildAdjustmentNotes({
  userId,
  planId,
  prevWeek,
}: {
  userId: string;
  planId: string;
  prevWeek: number;
}): Promise<string | undefined> {
  if (prevWeek < 1) return undefined;

  const [totalRow, doneRow, energyRow, missedRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(tasks)
      .where(and(eq(tasks.planId, planId), eq(tasks.weekNumber, prevWeek))),
    db
      .select({ done: count() })
      .from(completions)
      .where(
        and(
          eq(completions.userId, userId),
          eq(completions.planId, planId),
          eq(completions.weekNumber, prevWeek),
        ),
      ),
    db
      .select({ avg: avg(energyLogs.rating) })
      .from(energyLogs)
      .innerJoin(tasks, eq(tasks.id, energyLogs.taskId))
      .where(
        and(
          eq(energyLogs.userId, userId),
          eq(tasks.planId, planId),
          eq(tasks.weekNumber, prevWeek),
        ),
      ),
    db
      .select({ title: tasks.title })
      .from(tasks)
      .leftJoin(
        completions,
        and(
          eq(completions.taskId, tasks.id),
          eq(completions.userId, userId),
        ),
      )
      .where(
        and(
          eq(tasks.planId, planId),
          eq(tasks.weekNumber, prevWeek),
          isNull(completions.id),
        ),
      )
      .orderBy(asc(tasks.order))
      .limit(3),
  ]);

  const total = totalRow[0]?.total ?? 0;
  if (total === 0) return undefined;
  const done = doneRow[0]?.done ?? 0;
  const pct = Math.round((done / total) * 100);
  const avgEnergyRaw = energyRow[0]?.avg;
  const avgEnergy =
    avgEnergyRaw !== null && avgEnergyRaw !== undefined
      ? Number(avgEnergyRaw).toFixed(1)
      : "n/a";
  const missedSample = missedRows.map((r) => r.title).join("; ");

  const trend =
    pct >= 85
      ? "ahead of pace — ramp difficulty up"
      : pct >= 50
        ? "on pace — keep difficulty steady"
        : "behind pace — simplify and reinforce";

  return `Last week (${prevWeek}): ${done}/${total} tasks completed (${pct}%), average energy ${avgEnergy}/5. ${trend}.${missedSample ? ` Tasks they skipped: ${missedSample}.` : ""}`;
}
