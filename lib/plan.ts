import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { plans, type Plan } from "@/lib/db/schema";

/**
 * Returns the user's currently active plan, or null if they don't have one
 * yet. Replaces the old `getOrCreateEnrollment` — there's no auto-creation
 * anymore; the user must explicitly create a plan via /plans/new.
 *
 * Wrapped in `cache()` so a single server render dedupes the lookup across
 * the layout, page, and any helpers that need the plan.
 */
export const getActivePlan = cache(
  async (userId: string): Promise<Plan | null> => {
    const [row] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.userId, userId), eq(plans.status, "active")))
      .orderBy(desc(plans.createdAt))
      .limit(1);
    return row ?? null;
  },
);

/**
 * Same as getActivePlan but redirects to /plans/new when there's no plan.
 * Use from server components that should never render plan-less.
 */
export async function requireActivePlan(userId: string): Promise<Plan> {
  const plan = await getActivePlan(userId);
  if (!plan) redirect("/plans/new");
  return plan;
}

/** 1-based week relative to plan.startDate, capped to the plan duration. */
export function currentWeekFromPlan(plan: Plan, atDate: Date = new Date()): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsed = atDate.getTime() - plan.startDate.getTime();
  const week = Math.floor(elapsed / msPerWeek) + 1;
  return Math.min(Math.max(week, 1), plan.durationWeeks);
}
