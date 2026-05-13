import { NextRequest, NextResponse } from "next/server";
import { and, asc, avg, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  completions,
  energyLogs,
  planWeeks,
  plans,
  tasks,
} from "@/lib/db/schema";
import { generateWeekTasks } from "@/lib/ai";
import { LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { log } from "@/lib/log";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generates (or regenerates) the tasks for one week of an AI-plan.
 *
 *   - Validates plan ownership.
 *   - Builds an adjustment context from the previous week's completion rate
 *     and average energy (empty for week 1).
 *   - Calls the LLM, deletes existing tasks for that week, inserts the new
 *     batch with an incremented generation_version.
 *   - For week 1 specifically, flips plan.status from 'generating' → 'active'
 *     so the user can land on /today.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id: planId } = await params;
  if (!UUID_RE.test(planId)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }

  const rl = await checkRateLimit({
    key: `generate-week:${userId}`,
    ...LIMITS.generateWeek,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const weekRaw = req.nextUrl.searchParams.get("week");
  const weekNumber = weekRaw ? Number(weekRaw) : NaN;
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    return NextResponse.json(
      { error: "?week=N must be a positive integer" },
      { status: 400 },
    );
  }

  // 1. Verify ownership + grab inputs we need for the prompt.
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .limit(1);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (weekNumber > plan.durationWeeks) {
    return NextResponse.json(
      { error: `week must be 1..${plan.durationWeeks}` },
      { status: 400 },
    );
  }

  // Template plans already have tasks; nothing to generate.
  if (plan.source === "template") {
    return NextResponse.json(
      { error: "Template plans don't use LLM task generation" },
      { status: 400 },
    );
  }

  if (
    !plan.topic ||
    !plan.currentLevel ||
    plan.hoursPerDay === null ||
    plan.learningStyle === null
  ) {
    return NextResponse.json(
      { error: "Plan is missing wizard inputs" },
      { status: 400 },
    );
  }

  const [planWeek] = await db
    .select()
    .from(planWeeks)
    .where(
      and(eq(planWeeks.planId, planId), eq(planWeeks.weekNumber, weekNumber)),
    )
    .limit(1);
  if (!planWeek) {
    return NextResponse.json(
      { error: "Plan week not in outline" },
      { status: 404 },
    );
  }

  // 2. Build the adjustment context from the previous week (skipped for w1).
  let adjustmentNotes: string | undefined;
  if (weekNumber > 1) {
    adjustmentNotes = await buildAdjustmentNotes({
      userId,
      planId,
      prevWeek: weekNumber - 1,
    });
  }

  // 3. LLM call.
  let generated;
  try {
    generated = await generateWeekTasks({
      weekTheme: planWeek.theme,
      weekGoal: planWeek.goal,
      weekNumber,
      monthNumber: planWeek.monthNumber,
      topic: plan.topic,
      currentLevel: plan.currentLevel,
      hoursPerDay: plan.hoursPerDay,
      learningStyle: plan.learningStyle,
      adjustmentNotes,
    });
  } catch (err) {
    log.error("plan.week.failed", err, { userId, planId, weekNumber });
    const message =
      err instanceof Error ? err.message : "Task generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 4. Persist atomically: bump version, wipe old tasks for this plan_week,
  //    insert the new batch, mark the week generated, activate the plan if
  //    this was week 1.
  const nextVersion = planWeek.generationVersion + 1;
  await db.transaction(async (tx) => {
    await tx.delete(tasks).where(eq(tasks.planWeekId, planWeek.id));

    await tx.insert(tasks).values(
      generated.tasks.map((t, idx) => ({
        planId,
        planWeekId: planWeek.id,
        weekNumber,
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

    if (weekNumber === 1 && plan.status === "generating") {
      await tx
        .update(plans)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(plans.id, planId));
    }
  });

  return NextResponse.json({
    ok: true,
    planId,
    weekNumber,
    taskCount: generated.tasks.length,
    modelUsed: generated.modelUsed,
  });
}

async function buildAdjustmentNotes({
  userId,
  planId,
  prevWeek,
}: {
  userId: string;
  planId: string;
  prevWeek: number;
}): Promise<string | undefined> {
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
      .where(and(eq(tasks.planId, planId), eq(tasks.weekNumber, prevWeek)))
      .orderBy(asc(tasks.order))
      .limit(50),
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
  const missedSample = missedRows.slice(0, 3).map((r) => r.title).join("; ");

  const trend =
    pct >= 85
      ? "ahead of pace — ramp difficulty up"
      : pct >= 50
        ? "on pace — keep difficulty steady"
        : "behind pace — simplify and reinforce";

  return `Last week (${prevWeek}): ${done}/${total} tasks completed (${pct}%), average energy ${avgEnergy}/5. ${trend}. Examples of titles in the previous week: ${missedSample || "n/a"}.`;
}
