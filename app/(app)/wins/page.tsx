import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Trophy } from "lucide-react";
import { db } from "@/lib/db/client";
import { wins } from "@/lib/db/schema";
import { currentWeekFromPlan, requireActivePlan } from "@/lib/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/motion-fade-up";
import WinsForm from "./wins-form";

export default async function WinsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const plan = await requireActivePlan(userId);
  const currentWeek = currentWeekFromPlan(plan);
  const userWins = await db
    .select()
    .from(wins)
    .where(and(eq(wins.userId, userId), eq(wins.planId, plan.id)))
    .orderBy(desc(wins.weekNumber));

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="streak">
                <Trophy className="h-3 w-3" /> Weekly wins
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Weekly Wins
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Log your top 3 wins each week — small reflections build big
              momentum.
            </p>
          </div>
          <Link href="/today">
            <Button variant="outline" size="sm">
              Back to today
            </Button>
          </Link>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <WinsForm
          currentWeek={currentWeek}
          initialWins={userWins.map((w) => ({
            weekNumber: w.weekNumber,
            entries: w.entries,
            updatedAt: w.updatedAt.toISOString(),
          }))}
        />
      </FadeUp>
    </div>
  );
}
