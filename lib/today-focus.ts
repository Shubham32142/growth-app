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

function weekdaySlot(date: Date): number {
  // JS weekday: 0=Sun, 1=Mon ... 6=Sat. Sunday is a planned rest day.
  const day = date.getDay();
  return day;
}

function contiguousRangeForDay(
  totalTasks: number,
  weekday: number,
): [start: number, end: number] {
  if (weekday < 1 || weekday > 6 || totalTasks <= 0) return [0, 0];

  const base = Math.floor(totalTasks / 6);
  const remainder = totalTasks % 6;
  let start = 0;

  for (let day = 1; day < weekday; day += 1) {
    start += base + (day <= remainder ? 1 : 0);
  }

  const size = base + (weekday <= remainder ? 1 : 0);
  return [start, start + size];
}

export function pickTodaysTasks<T extends FocusTask>(tasks: T[], today: Date): T[] {
  const weekday = weekdaySlot(today);
  if (weekday === 0) return [];

  const ordered = [...tasks].sort((a, b) => a.order - b.order);
  const [start, end] = contiguousRangeForDay(ordered.length, weekday);
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