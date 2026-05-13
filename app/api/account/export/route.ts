import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  completions,
  energyLogs,
  planWeeks,
  plans,
  profiles,
  recaps,
  wins,
} from "@/lib/db/schema";

/**
 * GET /api/account/export — streams a JSON file containing every row the
 * current user owns. Downloadable via Content-Disposition.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const planRows = await db.select().from(plans).where(eq(plans.userId, userId));
  const planIds = planRows.map((p) => p.id);

  const [profileRows, planWeekRows, completionRows, energyRows, winRows, recapRows] =
    await Promise.all([
      db.select().from(profiles).where(eq(profiles.userId, userId)),
      planIds.length > 0
        ? db.select().from(planWeeks).where(inArray(planWeeks.planId, planIds))
        : Promise.resolve([]),
      db.select().from(completions).where(eq(completions.userId, userId)),
      db.select().from(energyLogs).where(eq(energyLogs.userId, userId)),
      db.select().from(wins).where(eq(wins.userId, userId)),
      db.select().from(recaps).where(eq(recaps.userId, userId)),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: userId,
      email: session.user.email,
      name: session.user.name,
    },
    profile: profileRows[0] ?? null,
    plans: planRows,
    planWeeks: planWeekRows,
    completions: completionRows,
    energyLogs: energyRows,
    wins: winRows,
    recaps: recapRows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="growthpath-export-${userId}.json"`,
    },
  });
}
