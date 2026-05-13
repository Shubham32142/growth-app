import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recaps } from "@/lib/db/schema";
import { requireActivePlan } from "@/lib/plan";
import RecapClient from "./recap-client";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function RecapPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const plan = await requireActivePlan(session.user.id);

  const { week: weekParam } = await params;
  const weekNumber = Number(weekParam);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > plan.durationWeeks
  ) {
    redirect("/progress");
  }

  const [recap] = await db
    .select()
    .from(recaps)
    .where(
      and(
        eq(recaps.userId, session.user.id),
        eq(recaps.planId, plan.id),
        eq(recaps.weekNumber, weekNumber),
      ),
    )
    .limit(1);

  const initialRecap = recap
    ? {
        weekNumber: recap.weekNumber,
        content: recap.content,
        achievements: recap.achievements,
        growthAreas: recap.growthAreas,
        improvements: recap.improvements,
        modelUsed: recap.modelUsed,
        shareToken: recap.shareToken ?? null,
      }
    : null;

  return <RecapClient weekNumber={weekNumber} initial={initialRecap} />;
}
