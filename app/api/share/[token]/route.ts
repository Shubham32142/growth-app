import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recaps } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || typeof token !== "string" || token.length !== 40) {
    return NextResponse.json({ error: "Invalid share token" }, { status: 400 });
  }

  const [recap] = await db
    .select()
    .from(recaps)
    .where(eq(recaps.shareToken, token))
    .limit(1);

  if (!recap) {
    return NextResponse.json({ error: "Recap not found" }, { status: 404 });
  }

  return NextResponse.json({
    recap: {
      weekNumber: recap.weekNumber,
      content: recap.content,
      achievements: recap.achievements,
      growthAreas: recap.growthAreas,
      improvements: recap.improvements,
    },
  });
}
