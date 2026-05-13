import { db } from "@/lib/db/client";
import {
  planWeeks,
  plans,
  resources,
  tasks,
  type CuratedResource,
} from "@/lib/db/schema";
import { getCuratedResources } from "@/lib/topic-map";

type TaskCategory = "technical" | "personal-growth" | "checkpoint";

interface ParsedTask {
  weekNumber: number;
  monthNumber: number;
  section: string;
  title: string;
  category: TaskCategory;
  order: number; // global order across the whole plan (kept for sort stability)
  estimatedMinutes: number;
}

interface ParseResult {
  title: string;
  durationWeeks: number;
  tasks: ParsedTask[];
}

// ── Markdown parser (unchanged from the Mongo version) ──────────────────────

export function parsePlan(markdown: string): ParseResult {
  const lines = markdown.split("\n");

  let currentMonth = 0;
  let currentWeek = 0;
  let currentSection = "";
  let category: TaskCategory = "technical";
  let taskOrder = 0;
  let inPersonalGrowthTrack = false;

  const parsed: ParsedTask[] = [];
  const weekToMonth = (week: number) => Math.ceil(week / 4);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("## PERSONAL GROWTH TRACK")) {
      inPersonalGrowthTrack = true;
      currentMonth = 0;
      currentWeek = 1;
      currentSection = "Personal Growth Track";
      category = "personal-growth";
      continue;
    }

    const monthMatch = trimmed.match(/^## MONTH (\d+)/);
    if (monthMatch) {
      currentMonth = parseInt(monthMatch[1]);
      currentWeek = (currentMonth - 1) * 4 + 1;
      inPersonalGrowthTrack = false;
      category = "technical";
      currentSection = trimmed.replace(/^## /, "");
      continue;
    }

    if (trimmed.startsWith("## ")) {
      inPersonalGrowthTrack = false;
      category = "technical";
      continue;
    }

    const weekMatch = trimmed.match(/^### Week (\d+):/);
    if (weekMatch) {
      currentWeek = parseInt(weekMatch[1]);
      currentSection = trimmed.replace(/^### /, "");
      category = "technical";
      continue;
    }

    const checkpointMatch = trimmed.match(/^### Month (\d+) Checkpoint/);
    if (checkpointMatch) {
      currentMonth = parseInt(checkpointMatch[1]);
      currentWeek = currentMonth * 4;
      currentSection = trimmed.replace(/^### /, "");
      category = "checkpoint";
      continue;
    }

    if (trimmed.startsWith("### ") && !weekMatch && !checkpointMatch) {
      currentSection = trimmed.replace(/^### /, "");
      if (
        inPersonalGrowthTrack ||
        /networking|burnout|growth mindset|portfolio|writing|communication/i.test(
          currentSection,
        )
      ) {
        category = "personal-growth";
      } else if (/checkpoint/i.test(currentSection)) {
        category = "checkpoint";
      } else {
        category = "technical";
      }
      continue;
    }

    const taskMatch = line.match(/^(\s*)- \[ \] (.+)/);
    if (!taskMatch) continue;

    const rawTitle = taskMatch[2].trim();
    const title = rawTitle
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .trim();

    if (!title) continue;
    if (currentSection === "" && currentMonth === 0 && currentWeek === 0)
      continue;

    const week = currentWeek || 1;
    const month = currentMonth || weekToMonth(week);

    let estimatedMinutes = 30;
    if (/\bproject\b/i.test(title) || /\bbuild\b/i.test(title))
      estimatedMinutes = 120;
    else if (category === "checkpoint") estimatedMinutes = 15;
    else if (/\bpractice\b|\bsolve\b|\bexercise\b/i.test(title))
      estimatedMinutes = 45;

    parsed.push({
      weekNumber: week,
      monthNumber: month,
      section: currentSection,
      title,
      category,
      order: taskOrder++,
      estimatedMinutes,
    });
  }

  return {
    title: "6-Month Developer Skill Plan (2026)",
    durationWeeks: 24,
    tasks: parsed,
  };
}

// ── Per-user template instantiation ────────────────────────────────────────

export interface ImportResult {
  planId: string;
  weeksInserted: number;
  tasksInserted: number;
  resourcesInserted: number;
}

/**
 * Creates a complete template plan for a given user from the markdown.
 * Used by the "skip the wizard" path on /plans/new.
 *
 * Idempotent for the same (userId, source='template') combination: if the
 * user already has a template plan, this throws and the caller can deal
 * with it (typically: they meant to reset first).
 */
export async function instantiateTemplatePlanForUser(
  userId: string,
  markdown: string,
): Promise<ImportResult> {
  const parsedPlan = parsePlan(markdown);

  return db.transaction(async (tx) => {
    // 1. Insert the per-user plan
    const [plan] = await tx
      .insert(plans)
      .values({
        userId,
        title: parsedPlan.title,
        topic: "Becoming a hireable developer",
        goal: "Land a developer job by completing a curated 6-month plan",
        currentLevel: "beginner-to-intermediate",
        hoursPerDay: 2,
        learningStyle: "mixed",
        durationWeeks: parsedPlan.durationWeeks,
        source: "template",
        status: "active",
      })
      .returning();

    // 2. Bucket tasks by week and pre-compute themes
    const byWeek = new Map<number, ParsedTask[]>();
    for (const t of parsedPlan.tasks) {
      const list = byWeek.get(t.weekNumber) ?? [];
      list.push(t);
      byWeek.set(t.weekNumber, list);
    }

    // 3. Insert plan_weeks rows + tasks rows under each
    let weeksInserted = 0;
    let tasksInserted = 0;
    let resourcesInserted = 0;

    for (let weekNumber = 1; weekNumber <= parsedPlan.durationWeeks; weekNumber++) {
      const weekTasks = byWeek.get(weekNumber) ?? [];
      const monthNumber = weekTasks[0]?.monthNumber ?? Math.ceil(weekNumber / 4);
      const theme = weekTasks[0]?.section ?? `Week ${weekNumber}`;
      const goal = `Complete week ${weekNumber} of the curated plan.`;

      const [planWeek] = await tx
        .insert(planWeeks)
        .values({
          planId: plan.id,
          weekNumber,
          monthNumber,
          theme,
          goal,
          tasksGeneratedAt: new Date(),
        })
        .returning();
      weeksInserted++;

      // Tasks for this week, re-ordered 0..N within the week
      for (let i = 0; i < weekTasks.length; i++) {
        const t = weekTasks[i];
        const [task] = await tx
          .insert(tasks)
          .values({
            planId: plan.id,
            planWeekId: planWeek.id,
            weekNumber,
            monthNumber: t.monthNumber,
            section: t.section,
            title: t.title,
            body: "",
            category: t.category,
            order: i,
            estimatedMinutes: t.estimatedMinutes,
          })
          .returning();
        tasksInserted++;

        const curated = getCuratedResources(t.title, t.section) as CuratedResource[];
        if (curated.length > 0) {
          await tx.insert(resources).values({ taskId: task.id, curated });
          resourcesInserted++;
        }
      }
    }

    return {
      planId: plan.id,
      weeksInserted,
      tasksInserted,
      resourcesInserted,
    };
  });
}
