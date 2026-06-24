import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  completions,
  energyLogs,
  plans,
  tasks,
} from "@/lib/db/schema";
import { completeTaskBody, parseBody } from "@/lib/schemas";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const parsed = await parseBody(req, completeTaskBody);
  if (!parsed.ok) return parsed.response;
  const { energyLevel, at } = parsed.data;
  const hasEnergy = typeof energyLevel === "number";
  const normalizedEnergy = energyLevel as 1 | 2 | 3 | 4 | 5 | undefined;

  // Optional back-fill date
  let backfillAt: Date | undefined;
  if (typeof at === "string" && at.length > 0) {
    const parsedDate = new Date(`${at}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "`at` is not a valid date" },
        { status: 400 },
      );
    }
    const startOfTomorrow = new Date();
    startOfTomorrow.setHours(0, 0, 0, 0);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    if (parsedDate.getTime() >= startOfTomorrow.getTime()) {
      return NextResponse.json(
        { error: "Cannot record completion for a future date" },
        { status: 400 },
      );
    }
    backfillAt = parsedDate;
  }

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify the user owns the plan this task belongs to.
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.id, task.planId), eq(plans.userId, userId)))
    .limit(1);
  if (!plan) {
    return NextResponse.json(
      { error: "Task does not belong to your plan" },
      { status: 403 },
    );
  }

  const completedAt = backfillAt ?? new Date();

  // Upsert by (user_id, task_id). On conflict, only update mutable fields.
  await db
    .insert(completions)
    .values({
      userId,
      taskId: task.id,
      planId: task.planId,
      weekNumber: task.weekNumber,
      completedAt,
      energyLevel: hasEnergy ? normalizedEnergy : undefined,
    })
    .onConflictDoUpdate({
      target: [completions.userId, completions.taskId],
      set: {
        ...(backfillAt ? { completedAt } : {}),
        ...(hasEnergy ? { energyLevel: normalizedEnergy } : {}),
      },
    });

  if (hasEnergy) {
    await db.insert(energyLogs).values({
      userId,
      taskId: task.id,
      rating: normalizedEnergy!,
      at: completedAt,
    });
  }

  // The client tracks progress optimistically and doesn't read a server count,
  // so we skip the two extra count round-trips here for a faster response.
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  await db
    .delete(completions)
    .where(
      and(eq(completions.userId, userId), eq(completions.taskId, id)),
    );

  return NextResponse.json({ ok: true });
}
