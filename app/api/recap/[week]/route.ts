import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { completions, recaps, tasks, wins } from "@/lib/db/schema";
import { getActivePlan } from "@/lib/plan";
import { computeStreak } from "@/lib/streak";
import { generateRecap } from "@/lib/ai";
import { getUserProviderConfig, NO_AI_CONFIG_ERROR } from "@/lib/ai-config";
import { LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ week: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const plan = await getActivePlan(userId);
  if (!plan) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  const { week: weekParam } = await params;
  const weekNumber = Number(weekParam);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > plan.durationWeeks
  ) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  const rl = await checkRateLimit({
    key: `recap:${userId}`,
    ...LIMITS.recap,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const aiConfig = await getUserProviderConfig(userId);
  if (!aiConfig) {
    return NextResponse.json({ error: NO_AI_CONFIG_ERROR }, { status: 400 });
  }

  const [weekCompletions, weekTaskCountRow, win, allCompletions] =
    await Promise.all([
      db
        .select()
        .from(completions)
        .where(
          and(
            eq(completions.userId, userId),
            eq(completions.planId, plan.id),
            eq(completions.weekNumber, weekNumber),
          ),
        ),
      db
        .select({ total: count() })
        .from(tasks)
        .where(
          and(eq(tasks.planId, plan.id), eq(tasks.weekNumber, weekNumber)),
        ),
      db
        .select()
        .from(wins)
        .where(
          and(
            eq(wins.userId, userId),
            eq(wins.planId, plan.id),
            eq(wins.weekNumber, weekNumber),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({ completedAt: completions.completedAt })
        .from(completions)
        .where(
          and(
            eq(completions.userId, userId),
            eq(completions.planId, plan.id),
          ),
        ),
    ]);

  const totalTasksInWeek = weekTaskCountRow[0]?.total ?? 0;

  const taskIds = weekCompletions.map((c) => c.taskId);
  const completedTasks =
    taskIds.length > 0
      ? await db
          .select({ title: tasks.title, category: tasks.category })
          .from(tasks)
          .where(inArray(tasks.id, taskIds))
      : [];

  const { currentStreak } = computeStreak(
    allCompletions.map((c) => c.completedAt),
  );

  const winsEntries = win ? (win.entries as string[]) : [];

  const recapData = await generateRecap(aiConfig, {
    weekNumber,
    completedTasks,
    totalTasksInWeek,
    currentStreak,
    winsEntries,
  });

  const [saved] = await db
    .insert(recaps)
    .values({
      userId,
      planId: plan.id,
      weekNumber,
      content: recapData.content,
      achievements: recapData.achievements,
      growthAreas: recapData.growthAreas,
      improvements: recapData.improvements,
      modelUsed: recapData.modelUsed,
    })
    .onConflictDoUpdate({
      target: [recaps.userId, recaps.planId, recaps.weekNumber],
      set: {
        content: recapData.content,
        achievements: recapData.achievements,
        growthAreas: recapData.growthAreas,
        improvements: recapData.improvements,
        modelUsed: recapData.modelUsed,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({
    ok: true,
    recap: {
      weekNumber: saved.weekNumber,
      content: saved.content,
      achievements: saved.achievements,
      growthAreas: saved.growthAreas,
      improvements: saved.improvements,
      modelUsed: saved.modelUsed,
      shareToken: saved.shareToken ?? null,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ week: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const plan = await getActivePlan(userId);
  if (!plan) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  const { week: weekParam } = await params;
  const weekNumber = Number(weekParam);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > plan.durationWeeks
  ) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  const [recap] = await db
    .select()
    .from(recaps)
    .where(
      and(
        eq(recaps.userId, userId),
        eq(recaps.planId, plan.id),
        eq(recaps.weekNumber, weekNumber),
      ),
    )
    .limit(1);

  if (!recap) {
    return NextResponse.json({ recap: null });
  }

  return NextResponse.json({
    recap: {
      weekNumber: recap.weekNumber,
      content: recap.content,
      achievements: recap.achievements,
      growthAreas: recap.growthAreas,
      improvements: recap.improvements,
      modelUsed: recap.modelUsed,
      shareToken: recap.shareToken ?? null,
    },
  });
}
