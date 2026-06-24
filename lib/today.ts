import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  completions,
  planWeeks,
  resources,
  tasks,
  type CuratedResource,
  type Task as DbTask,
} from "@/lib/db/schema";
import { getActivePlan } from "@/lib/plan";
import { computeStreak } from "@/lib/streak";
import { inferTaskBucket, pickTodaysTasks } from "@/lib/today-focus";

type TaskCategory = DbTask["category"];

export interface TaskRow {
  _id: string;
  title: string;
  body?: string;
  category: TaskCategory;
  bucket: string;
  estimatedMinutes?: number;
  completed: boolean;
  curated: CuratedResource[];
}

export interface TodayData {
  /** ISO YYYY-MM-DD of the rendered day. */
  dateISO: string;
  monthNumber: number;
  week: number;
  /** Total weeks in the active plan (was hard-coded 24 in v1). */
  durationWeeks: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isRestDay: boolean;
  streak: number;
  tasks: TaskRow[];
  total: number;
  /** True when the user has no active plan — caller should redirect to /plans/new. */
  hasPlan: boolean;
  /**
   * The active plan's id (null when hasPlan is false). The client needs this
   * to call /api/plans/[id]/generate-week for missing-week generation.
   */
  planId: string | null;
  /** ISO YYYY-MM-DD of the plan's start date (null when no plan). The day strip
   *  uses this so days before the plan started are never shown. */
  planStartISO: string | null;
  /**
   * True when the visible week exists in the outline but its tasks haven't
   * been generated yet — typically because the cron hasn't run yet or the
   * user navigated to a week the cron hasn't reached. The client shows a
   * "Generate week N now" CTA in this case.
   */
  weekNeedsGeneration: boolean;
  /** True when the visible week is within the plan's duration. */
  weekInRange: boolean;
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDays(input: Date, delta: number): Date {
  const next = new Date(input);
  next.setDate(next.getDate() + delta);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function parseDateParam(raw?: string): Date | "invalid" {
  if (!raw) return new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  return parsed;
}

function emptyData(selectedDate: Date): TodayData {
  const today = startOfDay(new Date());
  const selected = startOfDay(selectedDate);
  return {
    dateISO: dateKey(selectedDate),
    monthNumber: 1,
    week: 1,
    durationWeeks: 0,
    isToday: today.getTime() === selected.getTime(),
    isPast: selected.getTime() < today.getTime(),
    isFuture: selected.getTime() > today.getTime(),
    isRestDay: selectedDate.getDay() === 0,
    streak: 0,
    tasks: [],
    total: 0,
    hasPlan: false,
    planId: null,
    planStartISO: null,
    weekNeedsGeneration: false,
    weekInRange: false,
  };
}

export async function loadTodayData(
  userId: string,
  selectedDate: Date,
): Promise<TodayData> {
  const plan = await getActivePlan(userId);
  if (!plan) return emptyData(selectedDate);

  // Everything is anchored to the plan's START DATE, not the calendar week, so
  // "the plan starts today": day offset 0 = creation date = week 1, day 1.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const planStart = startOfDay(plan.startDate);
  const selectedStart = startOfDay(selectedDate);
  const dayOffset = Math.round(
    (selectedStart.getTime() - planStart.getTime()) / DAY_MS,
  );
  const rawWeek = Math.floor(dayOffset / 7) + 1; // can be < 1 before the plan
  const week = Math.min(Math.max(rawWeek, 1), plan.durationWeeks);
  const weekInRange = dayOffset >= 0 && rawWeek <= plan.durationWeeks;
  // 0..5 = working days; 6 = rest day (the 7th day from the plan start).
  const dayInWeek = ((dayOffset % 7) + 7) % 7;
  const isRestDay = weekInRange && dayInWeek === 6;

  const [weekTasks, userCompletions, planWeekRow] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.planId, plan.id), eq(tasks.weekNumber, week)))
      .orderBy(asc(tasks.order)),
    db
      .select()
      .from(completions)
      .where(
        and(eq(completions.userId, userId), eq(completions.planId, plan.id)),
      ),
    db
      .select({ tasksGeneratedAt: planWeeks.tasksGeneratedAt })
      .from(planWeeks)
      .where(
        and(eq(planWeeks.planId, plan.id), eq(planWeeks.weekNumber, week)),
      )
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  const weekNeedsGeneration =
    weekInRange &&
    Boolean(planWeekRow) &&
    !planWeekRow!.tasksGeneratedAt &&
    weekTasks.length === 0;

  const todayTasks = weekInRange
    ? pickTodaysTasks(
        weekTasks.map((t) => ({
          _id: t.id,
          title: t.title,
          body: t.body,
          category: t.category,
          order: t.order,
        })),
        dayInWeek,
      )
    : [];

  const todayTaskIds = todayTasks.map((t) => t._id);
  const taskResources =
    todayTaskIds.length > 0
      ? await db
          .select()
          .from(resources)
          .where(inArray(resources.taskId, todayTaskIds))
      : [];

  const curatedMap = new Map(
    taskResources.map((r) => [r.taskId, r.curated ?? []]),
  );

  const completedIds = new Set(userCompletions.map((c) => c.taskId));
  const { currentStreak } = computeStreak(
    userCompletions.map((c) => c.completedAt),
  );

  const todayIdSet = new Set(todayTaskIds);
  const rows: TaskRow[] = weekTasks
    .filter((t) => todayIdSet.has(t.id))
    .map((t) => ({
      _id: t.id,
      title: t.title,
      body: t.body,
      category: t.category,
      bucket: inferTaskBucket({
        title: t.title,
        body: t.body,
        category: t.category,
      }),
      estimatedMinutes: t.estimatedMinutes ?? undefined,
      completed: completedIds.has(t.id),
      curated: curatedMap.get(t.id) ?? [],
    }));

  const today = startOfDay(new Date());
  const isFuture = selectedStart.getTime() > today.getTime();
  const isPast = selectedStart.getTime() < today.getTime();

  return {
    dateISO: dateKey(selectedDate),
    monthNumber: weekTasks[0]?.monthNumber ?? Math.ceil(week / 4),
    week,
    durationWeeks: plan.durationWeeks,
    isToday: !isFuture && !isPast,
    isPast,
    isFuture,
    isRestDay,
    streak: currentStreak,
    tasks: rows,
    total: rows.length,
    hasPlan: true,
    planId: plan.id,
    planStartISO: dateKey(planStart),
    weekNeedsGeneration,
    weekInRange,
  };
}
