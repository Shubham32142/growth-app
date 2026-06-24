import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { planWeeks, plans } from "@/lib/db/schema";
import { generatePlanOutline } from "@/lib/ai";
import { getUserProviderConfig, NO_AI_CONFIG_ERROR } from "@/lib/ai-config";
import { getActivePlan } from "@/lib/plan";
import { createPlanBody, parseBody } from "@/lib/schemas";
import { LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import { log } from "@/lib/log";

/**
 * Creates a new AI-generated plan from the 5-question wizard.
 *
 *   1. Validates inputs.
 *   2. Refuses if the user already has an active plan (one active per user).
 *   3. Inserts a plan row with status='generating'.
 *   4. Calls the outline LLM and inserts plan_weeks rows.
 *   5. Returns { planId } — the client then navigates to /plans/new/generating
 *      which fires the second LLM call (generate week 1 tasks) and flips
 *      status to 'active'.
 *
 * If anything fails after step 3, the partial plan row is deleted so the
 * user can retry without hitting the "you already have an active plan" wall.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = await checkRateLimit({
    key: `plan-create:${userId}`,
    ...LIMITS.planCreate,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const parsed = await parseBody(req, createPlanBody);
  if (!parsed.ok) return parsed.response;
  const {
    topic,
    goal,
    currentLevel,
    hoursPerDay,
    learningStyle,
    durationWeeks,
  } = parsed.data;

  // BYOK: the user must have configured their own AI provider + key.
  const aiConfig = await getUserProviderConfig(userId);
  if (!aiConfig) {
    return NextResponse.json({ error: NO_AI_CONFIG_ERROR }, { status: 400 });
  }

  const existing = await getActivePlan(userId);
  if (existing) {
    return NextResponse.json(
      { error: "You already have an active plan. Reset it from /admin first." },
      { status: 409 },
    );
  }

  // 1. Insert the plan in 'generating' state up-front so we have a row to
  //    delete if the LLM call later fails.
  const [plan] = await db
    .insert(plans)
    .values({
      userId,
      title: `${topic} — ${durationWeeks} weeks`,
      topic,
      goal,
      currentLevel,
      hoursPerDay,
      learningStyle,
      durationWeeks,
      source: "ai-generated",
      status: "generating",
    })
    .returning();

  try {
    // 2. Generate the outline (1 LLM call). Validates that the LLM returned
    //    exactly `durationWeeks` weeks.
    const outline = await generatePlanOutline(aiConfig, {
      topic,
      goal,
      currentLevel,
      hoursPerDay,
      learningStyle,
      durationWeeks,
    });

    // 3. Replace the plan title with the LLM-generated one (usually more
    //    specific than `topic — N weeks`).
    await db
      .update(plans)
      .set({ title: outline.title, updatedAt: new Date() })
      .where(eq(plans.id, plan.id));

    // 4. Insert the week rows in one batch.
    await db.insert(planWeeks).values(
      outline.weeks.map((w) => ({
        planId: plan.id,
        weekNumber: w.weekNumber,
        monthNumber: w.monthNumber,
        theme: w.theme,
        goal: w.goal,
      })),
    );

    return NextResponse.json({
      ok: true,
      planId: plan.id,
      outlineWeeks: outline.weeks.length,
    });
  } catch (err) {
    // Roll back the partial plan so the user can retry cleanly.
    await db.delete(plans).where(eq(plans.id, plan.id)).catch(() => {});
    log.error("plan.outline.failed", err, { userId, planId: plan.id });
    const message =
      err instanceof Error ? err.message : "Plan generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
