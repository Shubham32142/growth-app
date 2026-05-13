import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { getActivePlan } from "@/lib/plan";

/** Returns the user's active plan, or `{ plan: null }`. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plan = await getActivePlan(session.user.id);
  return NextResponse.json({ plan });
}

/**
 * Deletes the user's active plan. CASCADE wipes plan_weeks → tasks →
 * completions / energy_logs / resources / wins / recaps. Caller (the
 * /admin Danger Zone) then redirects the user to /plans/new for a fresh
 * start.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const plan = await getActivePlan(userId);
  if (!plan) {
    return NextResponse.json(
      { error: "No active plan to delete" },
      { status: 404 },
    );
  }

  const [deleted] = await db
    .delete(plans)
    .where(and(eq(plans.id, plan.id), eq(plans.userId, userId)))
    .returning({ id: plans.id });

  return NextResponse.json({ ok: true, deletedPlanId: deleted?.id ?? null });
}
