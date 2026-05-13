import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { wins } from "@/lib/db/schema";
import { currentWeekFromPlan, getActivePlan } from "@/lib/plan";
import { parseBody, saveWinsBody } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const plan = await getActivePlan(userId);
  if (!plan) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  const weekParam = req.nextUrl.searchParams.get("week");
  const week = weekParam ? Number(weekParam) : undefined;

  if (
    week !== undefined &&
    (!Number.isInteger(week) || week < 1 || week > plan.durationWeeks)
  ) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  if (week !== undefined) {
    const [doc] = await db
      .select()
      .from(wins)
      .where(
        and(
          eq(wins.userId, userId),
          eq(wins.planId, plan.id),
          eq(wins.weekNumber, week),
        ),
      )
      .limit(1);
    return NextResponse.json({
      week,
      hasEntry: Boolean(doc),
      win: doc
        ? {
            weekNumber: doc.weekNumber,
            entries: doc.entries,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          }
        : null,
    });
  }

  const currentWeek = currentWeekFromPlan(plan);
  const docs = await db
    .select()
    .from(wins)
    .where(and(eq(wins.userId, userId), eq(wins.planId, plan.id)))
    .orderBy(desc(wins.weekNumber));
  return NextResponse.json({
    currentWeek,
    wins: docs.map((d) => ({
      weekNumber: d.weekNumber,
      entries: d.entries,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const plan = await getActivePlan(userId);
  if (!plan) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  const parsed = await parseBody(req, saveWinsBody);
  if (!parsed.ok) return parsed.response;
  const { entries, weekNumber: weekFromBody } = parsed.data;

  const inferredWeek = currentWeekFromPlan(plan);
  const weekNumber = weekFromBody ?? inferredWeek;

  if (weekNumber < 1 || weekNumber > plan.durationWeeks) {
    return NextResponse.json(
      { error: `weekNumber must be between 1 and ${plan.durationWeeks}` },
      { status: 400 },
    );
  }

  const [saved] = await db
    .insert(wins)
    .values({ userId, planId: plan.id, weekNumber, entries })
    .onConflictDoUpdate({
      target: [wins.userId, wins.planId, wins.weekNumber],
      set: { entries, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({
    ok: true,
    win: {
      weekNumber: saved.weekNumber,
      entries: saved.entries,
      updatedAt: saved.updatedAt,
    },
  });
}
