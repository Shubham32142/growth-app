import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { recaps } from "@/lib/db/schema";
import { getActivePlan } from "@/lib/plan";

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
    return NextResponse.json(
      { error: "No recap for this week yet. Generate it first." },
      { status: 404 },
    );
  }

  if (recap.shareToken) {
    return NextResponse.json({ shareToken: recap.shareToken });
  }

  const shareToken = randomBytes(20).toString("hex");
  await db
    .update(recaps)
    .set({ shareToken, updatedAt: new Date() })
    .where(eq(recaps.id, recap.id));

  return NextResponse.json({ shareToken });
}
