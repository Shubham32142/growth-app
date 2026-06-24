export type FocusCategory = "technical" | "personal-growth" | "checkpoint";

export interface FocusTask {
  _id: string;
  title: string;
  body?: string;
  category: FocusCategory;
  order: number;
}

const BUCKET_PATTERNS: Array<{ bucket: string; patterns: RegExp[] }> = [
  {
    bucket: "JavaScript",
    patterns: [/\bjavascript\b/i, /\bjs\b/i, /\bes6\b/i],
  },
  {
    bucket: "TypeScript",
    patterns: [/\btypescript\b/i, /\bts\b/i],
  },
  {
    bucket: "React",
    patterns: [/\breact\b/i, /\bjsx\b/i, /\bhooks?\b/i],
  },
  {
    bucket: "Next.js",
    patterns: [/\bnext\.js\b/i, /\bapp router\b/i, /\brsc\b/i],
  },
  {
    bucket: "Backend APIs",
    patterns: [
      /\bapi\b/i,
      /\bbackend\b/i,
      /\brest\b/i,
      /\bgraphql\b/i,
      /\bexpress\b/i,
      /\bnode\b/i,
    ],
  },
  {
    bucket: "Databases",
    patterns: [/\bsql\b/i, /\bmongodb\b/i, /\bpostgres\b/i, /\bdb\b/i],
  },
  {
    bucket: "DSA",
    patterns: [
      /\balgorithm/i,
      /\bdata structure/i,
      /\bdsa\b/i,
      /\bleetcode\b/i,
    ],
  },
  {
    bucket: "System Design",
    patterns: [
      /\bsystem design\b/i,
      /\bscalab/i,
      /\barchitecture\b/i,
      /\bcaching\b/i,
    ],
  },
  {
    bucket: "Career",
    patterns: [
      /\bresume\b/i,
      /\bportfolio\b/i,
      /\binterview\b/i,
      /\blinkedin\b/i,
      /\bnetworking\b/i,
    ],
  },
];

export function categoryDisplayName(category: FocusCategory): string {
  if (category === "technical") return "Technical Growth";
  if (category === "personal-growth") return "Personal Growth";
  return "Checkpoints";
}

function rangeForWorkingDay(
  totalTasks: number,
  workingDay: number, // 0-based: 0..5
): [start: number, end: number] {
  if (workingDay < 0 || workingDay > 5 || totalTasks <= 0) return [0, 0];

  const base = Math.floor(totalTasks / 6);
  const remainder = totalTasks % 6;
  let start = 0;

  for (let day = 0; day < workingDay; day += 1) {
    start += base + (day < remainder ? 1 : 0);
  }

  const size = base + (workingDay < remainder ? 1 : 0);
  return [start, start + size];
}

/**
 * Slice a week's tasks for one day, by the day's position *within the plan
 * week* — NOT the calendar weekday. `dayInWeek` is 0-based from the plan's
 * start date: 0..5 are the six working days (tasks spread across them) and 6
 * is the rest day (no tasks). This is what makes "the plan starts today":
 * day 1 of week 1 is the creation date, whatever weekday that is.
 */
export function pickTodaysTasks<T extends FocusTask>(
  tasks: T[],
  dayInWeek: number,
): T[] {
  if (dayInWeek < 0 || dayInWeek > 5) return []; // 6 = rest day (or out of range)

  const ordered = [...tasks].sort((a, b) => a.order - b.order);
  const [start, end] = rangeForWorkingDay(ordered.length, dayInWeek);
  return ordered.slice(start, end);
}

export function inferTaskBucket(task: Pick<FocusTask, "title" | "body" | "category">): string {
  const haystack = `${task.title} ${task.body ?? ""}`;

  for (const entry of BUCKET_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(haystack))) {
      return entry.bucket;
    }
  }

  return categoryDisplayName(task.category);
}