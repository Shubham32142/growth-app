/**
 * OpenRouter AI client.
 * Three roles:
 *   1. Rank real search results (never invents URLs)
 *   2. Generate plan outlines (week × theme × goal) from wizard inputs
 *   3. Generate a week's tasks calibrated to last week's actual progress
 *   4. Write a weekly recap from completion data
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Resolution order:
//  1. DB setting (set via /admin) — takes highest priority
//  2. OPENROUTER_MODEL env var — set in .env.local for a per-deploy default
//  3. Hardcoded fallback (free Llama model)
const HARDCODED_DEFAULT = "meta-llama/llama-3.2-3b-instruct:free";

export async function getActiveModel(): Promise<string> {
  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "openrouter.model"))
      .limit(1);
    if (row?.value) return row.value;
  } catch {
    // DB unavailable — fall through to env / hardcoded
  }
  return process.env.OPENROUTER_MODEL?.trim() || HARDCODED_DEFAULT;
}

export interface RankedResult {
  title: string;
  url: string;
  snippet: string;
  reason: string;
}

interface SearchCandidate {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Ask the LLM to filter and rank `candidates` (real URLs from Tavily) for
 * beginner-friendliness. Returns up to `topN` items, only from the input list.
 */
export async function rankResources(
  taskTitle: string,
  candidates: SearchCandidate[],
  topN = 5,
): Promise<RankedResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = await getActiveModel();

  const candidateList = candidates
    .map((c, i) => `[${i}] ${c.title}\nURL: ${c.url}\nSnippet: ${c.snippet}`)
    .join("\n\n");

  const systemPrompt = `You are a learning resource curator. The user is studying "${taskTitle}".
You will be given a numbered list of real search results (title, URL, snippet).
Select the best ${topN} results for a beginner and explain why each is helpful.
IMPORTANT: Only use URLs exactly as provided — do NOT invent, modify or hallucinate any URLs.
Respond with valid JSON only, matching this schema exactly:
{ "picks": [{ "index": number, "reason": string }] }`;

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://growthpath.app",
      "X-Title": "GrowthPath",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: candidateList },
      ],
      response_format: { type: "json_object" },
      max_tokens: 512,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    model: string;
  };

  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: { picks?: { index: number; reason: string }[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  return (parsed.picks ?? [])
    .filter((p) => p.index >= 0 && p.index < candidates.length)
    .slice(0, topN)
    .map((p) => ({
      ...candidates[p.index],
      reason: p.reason,
    }));
}

// ---------------------------------------------------------------------------
// Weekly recap generation
// ---------------------------------------------------------------------------

export interface RecapInput {
  weekNumber: number;
  completedTasks: { title: string; category: string }[];
  totalTasksInWeek: number;
  currentStreak: number;
  winsEntries: string[]; // flat list from Win.entries for this week
}

export interface RecapOutput {
  content: string; // short markdown narrative (≤300 words)
  achievements: string[]; // 2-4 bullet strings
  growthAreas: string[]; // 2-3 bullet strings
  improvements: string[]; // 1-2 suggestions
  modelUsed: string;
}

export async function generateRecap(input: RecapInput): Promise<RecapOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = await getActiveModel();

  const completedTitles = input.completedTasks
    .map((t) => `- ${t.title} (${t.category})`)
    .join("\n");

  const winsText =
    input.winsEntries.length > 0
      ? input.winsEntries.map((w) => `- ${w}`).join("\n")
      : "No explicit wins logged this week.";

  const systemPrompt = `You are an encouraging learning coach writing a brief weekly progress recap.
Be warm, specific, and motivating. Keep the tone calm and professional — no hype.
The user is following a 6-month developer learning plan.

Respond ONLY with valid JSON matching this schema exactly:
{
  "content": "<short markdown narrative ≤250 words, second-person, no headers>",
  "achievements": ["<achievement 1>", "<achievement 2>", "..."],
  "growthAreas": ["<area 1>", "<area 2>"],
  "improvements": ["<suggestion 1>"]
}

- achievements: 2-4 items, specific to tasks completed
- growthAreas: 2-3 areas they practised this week
- improvements: 1-2 actionable suggestions for next week
- content: flowing prose recap tying everything together`;

  const userMessage = `Week ${input.weekNumber} summary:
Completed: ${input.completedTasks.length} / ${input.totalTasksInWeek} tasks
Current streak: ${input.currentStreak} day(s)

Tasks completed this week:
${completedTitles || "None completed this week."}

Wins logged by the user:
${winsText}`;

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://growthpath.app",
      "X-Title": "GrowthPath",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 768,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    model: string;
  };

  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<RecapOutput>;
  try {
    parsed = JSON.parse(content) as Partial<RecapOutput>;
  } catch {
    parsed = {};
  }

  return {
    content:
      typeof parsed.content === "string"
        ? parsed.content
        : "Great work this week!",
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    growthAreas: Array.isArray(parsed.growthAreas) ? parsed.growthAreas : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    modelUsed: data.model ?? model,
  };
}

// ---------------------------------------------------------------------------
// Plan outline generation
// ---------------------------------------------------------------------------

export interface OutlineInput {
  topic: string;
  goal: string;
  currentLevel: string;
  hoursPerDay: number;
  learningStyle: "videos" | "reading" | "projects" | "mixed";
  durationWeeks: number;
}

export interface OutlineWeek {
  weekNumber: number;
  monthNumber: number;
  theme: string;
  goal: string;
}

export interface OutlineOutput {
  title: string;
  weeks: OutlineWeek[];
  modelUsed: string;
}

/**
 * Generates the high-level outline of a plan — title + (weeks × theme × goal).
 * Tasks are NOT generated here; they're produced per-week by
 * `generateWeekTasks` lazily as the user progresses.
 *
 * Prompt strategy: the LLM gets a short, opinionated brief about what makes
 * a good multi-month plan (vary themes, build progressively, leave room for
 * checkpoints) plus a strict JSON schema. We don't pass the markdown plan
 * as an example because that would bias every plan toward dev topics; we
 * encode the structure in the schema + system prompt instead.
 */
export async function generatePlanOutline(
  input: OutlineInput,
): Promise<OutlineOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = await getActiveModel();
  const months = Math.max(1, Math.ceil(input.durationWeeks / 4));

  const systemPrompt = `You design multi-month personal growth plans.

You will produce a plan outline as JSON. Each week has ONE theme and ONE concrete weekly goal — the daily tasks are generated separately later, so do NOT list tasks here.

Hard rules:
- Plan must span exactly ${input.durationWeeks} weeks (${months} months, ~4 weeks per month).
- weekNumber is 1..${input.durationWeeks}; monthNumber is 1..${months} (weekNumber 1-4 = month 1, 5-8 = month 2, ...).
- Theme = a short noun phrase (e.g. "JavaScript fundamentals", "Long-run base building", "Conversational vocabulary").
- Goal = one specific sentence about what the learner will be able to do/produce by the end of that week.
- Build progressively. Week N should depend on weeks 1..N-1.
- Every 4th week (4, 8, 12, ...) should be a CHECKPOINT/CONSOLIDATION week — apply what they've learned, not new material.
- Tailor difficulty to the user's stated current level and hours/day.
- Tailor format to the user's preferred learning style (videos / reading / projects / mixed).

Output STRICT JSON only, matching:
{
  "title": "<short, specific plan title — not generic>",
  "weeks": [
    { "weekNumber": 1, "monthNumber": 1, "theme": "...", "goal": "..." },
    ...
  ]
}`;

  const userMessage = `Design a plan:
- Topic: ${input.topic}
- End goal: ${input.goal}
- Current level: ${input.currentLevel}
- Available time: ${input.hoursPerDay} hour(s)/day
- Preferred learning style: ${input.learningStyle}
- Duration: ${input.durationWeeks} weeks`;

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://growthpath.app",
      "X-Title": "GrowthPath",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    model: string;
  };
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  let parsed: Partial<{ title: string; weeks: unknown }>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned non-JSON output for plan outline");
  }

  const weeks: OutlineWeek[] = Array.isArray(parsed.weeks)
    ? parsed.weeks
        .filter(
          (w): w is OutlineWeek =>
            typeof w === "object" &&
            w !== null &&
            typeof (w as Record<string, unknown>).weekNumber === "number" &&
            typeof (w as Record<string, unknown>).monthNumber === "number" &&
            typeof (w as Record<string, unknown>).theme === "string" &&
            typeof (w as Record<string, unknown>).goal === "string",
        )
        .map((w) => ({
          weekNumber: w.weekNumber,
          monthNumber: w.monthNumber,
          theme: w.theme,
          goal: w.goal,
        }))
        .filter(
          (w) =>
            w.weekNumber >= 1 &&
            w.weekNumber <= input.durationWeeks &&
            w.monthNumber >= 1 &&
            w.monthNumber <= months,
        )
        .sort((a, b) => a.weekNumber - b.weekNumber)
    : [];

  if (weeks.length !== input.durationWeeks) {
    throw new Error(
      `LLM returned ${weeks.length} weeks; expected exactly ${input.durationWeeks}`,
    );
  }

  return {
    title:
      typeof parsed.title === "string" && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : `${input.topic} — ${input.durationWeeks} weeks`,
    weeks,
    modelUsed: data.model ?? model,
  };
}

// ---------------------------------------------------------------------------
// Weekly task generation (with completion-based adaptation)
// ---------------------------------------------------------------------------

export interface WeekTaskInput {
  weekTheme: string;
  weekGoal: string;
  weekNumber: number;
  monthNumber: number;
  topic: string;
  currentLevel: string;
  hoursPerDay: number;
  learningStyle: "videos" | "reading" | "projects" | "mixed";
  /** Free-text context from the previous week's completion data. Empty for week 1. */
  adjustmentNotes?: string;
}

export interface GeneratedTask {
  title: string;
  body: string;
  section: string;
  category: "technical" | "personal-growth" | "checkpoint";
  estimatedMinutes: number;
}

export interface WeekTasksOutput {
  tasks: GeneratedTask[];
  modelUsed: string;
  adjustmentNotes: string;
}

/**
 * Generates one week's task list. For week 1 the LLM has no signal from
 * prior weeks. From week 2 onward the caller passes `adjustmentNotes` (a
 * human-readable summary of last week: completion %, avg energy, struggling
 * topics) so the LLM can calibrate difficulty.
 */
export async function generateWeekTasks(
  input: WeekTaskInput,
): Promise<WeekTasksOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = await getActiveModel();

  // Daily task budget: ~1 task per (hours/day × 60 / 30min avg). Cap at 7.
  const tasksPerDay = Math.max(1, Math.min(4, Math.round(input.hoursPerDay * 1.5)));
  const tasksThisWeek = tasksPerDay * 6; // 6 active days (Sunday is rest)

  const systemPrompt = `You write specific, beginner-friendly daily tasks for one week of a multi-month plan.

This week's context:
- Plan topic: ${input.topic}
- Learner's current level: ${input.currentLevel}
- Available time per day: ${input.hoursPerDay} hour(s)
- Preferred learning style: ${input.learningStyle}
- Week ${input.weekNumber} theme: "${input.weekTheme}"
- Week ${input.weekNumber} goal: "${input.weekGoal}"

Hard rules:
- Produce EXACTLY ${tasksThisWeek} tasks for this week (6 working days, ~${tasksPerDay} tasks/day).
- Tasks must be CONCRETE and ACTIONABLE — e.g. "Build a working todo-list with React state" not "learn React".
- Title is a short imperative sentence. Body is 1-2 sentences of detail.
- `+'`section`'+` is the sub-area within the theme (e.g. "Hooks", "Async patterns", "Cardio base") — group similar tasks under the same section.
- `+'`category`'+` is one of: "technical", "personal-growth", "checkpoint".
- `+'`estimatedMinutes`'+` is realistic: 15-30 for reading/practice, 30-60 for build tasks, 60-120 for projects.
- Tailor task FORMAT to the learner's style: videos→watch+do, reading→read+notes, projects→build, mixed→variety.
${input.adjustmentNotes ? `\nADAPTATION SIGNAL (previous week):\n${input.adjustmentNotes}\nAdjust difficulty accordingly — if completion was low or energy was poor, simplify; if both were high, ramp up.` : ""}

Output STRICT JSON only:
{
  "tasks": [
    { "title": "...", "body": "...", "section": "...", "category": "technical", "estimatedMinutes": 30 },
    ...
  ]
}`;

  const userMessage = `Generate the ${tasksThisWeek} tasks for week ${input.weekNumber}.`;

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://growthpath.app",
      "X-Title": "GrowthPath",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3072,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    model: string;
  };
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  let parsed: { tasks?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned non-JSON output for week tasks");
  }

  const allowedCategories = new Set([
    "technical",
    "personal-growth",
    "checkpoint",
  ]);

  const tasks: GeneratedTask[] = Array.isArray(parsed.tasks)
    ? parsed.tasks
        .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
        .map((t) => ({
          title: String(t.title ?? "").trim(),
          body: String(t.body ?? "").trim(),
          section: String(t.section ?? input.weekTheme).trim(),
          category: (allowedCategories.has(String(t.category))
            ? String(t.category)
            : "technical") as GeneratedTask["category"],
          estimatedMinutes:
            typeof t.estimatedMinutes === "number" &&
            Number.isFinite(t.estimatedMinutes)
              ? Math.max(5, Math.min(240, Math.round(t.estimatedMinutes)))
              : 30,
        }))
        .filter((t) => t.title.length > 0)
    : [];

  if (tasks.length === 0) {
    throw new Error("LLM returned zero valid tasks");
  }

  return {
    tasks,
    modelUsed: data.model ?? model,
    adjustmentNotes: input.adjustmentNotes ?? "",
  };
}
