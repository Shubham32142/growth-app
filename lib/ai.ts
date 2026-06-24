/**
 * AI generation (provider-agnostic, BYOK).
 *
 * Every function takes a `ProviderConfig` (the calling user's chosen provider +
 * their own API key + model) and routes through `chatJSON` in lib/ai-providers.
 * Four roles:
 *   1. Rank real search results (never invents URLs)
 *   2. Generate plan outlines (week × theme × goal) from wizard inputs
 *   3. Generate a week's tasks calibrated to last week's actual progress
 *   4. Write a weekly recap from completion data
 */

import { log } from "@/lib/log";
import {
  chatJSON,
  parseJsonLoose,
  type ProviderConfig,
} from "@/lib/ai-providers";

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
  cfg: ProviderConfig,
  taskTitle: string,
  candidates: SearchCandidate[],
  topN = 5,
): Promise<RankedResult[]> {
  const candidateList = candidates
    .map((c, i) => `[${i}] ${c.title}\nURL: ${c.url}\nSnippet: ${c.snippet}`)
    .join("\n\n");

  const systemPrompt = `You are a learning resource curator. The user is studying "${taskTitle}".
You will be given a numbered list of real search results (title, URL, snippet).
Select the best ${topN} results for a beginner and explain why each is helpful.
IMPORTANT: Only use URLs exactly as provided — do NOT invent, modify or hallucinate any URLs.
Respond with valid JSON only, matching this schema exactly:
{ "picks": [{ "index": number, "reason": string }] }`;

  const { text } = await chatJSON(cfg, {
    system: systemPrompt,
    user: candidateList,
    maxTokens: 512,
    temperature: 0.1,
  });

  const parsed = parseJsonLoose<{
    picks?: { index: number; reason: string }[];
  }>(text);
  if (!parsed) return [];

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

export async function generateRecap(
  cfg: ProviderConfig,
  input: RecapInput,
): Promise<RecapOutput> {
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

  const { text, modelUsed } = await chatJSON(cfg, {
    system: systemPrompt,
    user: userMessage,
    maxTokens: 768,
    temperature: 0.7,
  });

  const parsed = parseJsonLoose<Partial<RecapOutput>>(text) ?? {};

  return {
    content:
      typeof parsed.content === "string"
        ? parsed.content
        : "Great work this week!",
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    growthAreas: Array.isArray(parsed.growthAreas) ? parsed.growthAreas : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    modelUsed,
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
 */
export async function generatePlanOutline(
  cfg: ProviderConfig,
  input: OutlineInput,
): Promise<OutlineOutput> {
  const months = Math.max(1, Math.ceil(input.durationWeeks / 4));

  const first = await callOutlineLLM({ cfg, input, months, strict: false });
  let weeks = first.weeks;
  let title = first.title;
  let modelUsed = first.modelUsed;

  // Retry once with a hardened prompt if the LLM came back short. Small
  // / free models occasionally stop early; a stricter pass usually
  // unblocks them without a quality hit.
  if (weeks.length !== input.durationWeeks) {
    log.warn("plan.outline.count_mismatch", {
      got: weeks.length,
      expected: input.durationWeeks,
      retrying: true,
    });
    const retry = await callOutlineLLM({ cfg, input, months, strict: true });
    if (retry.weeks.length > weeks.length) {
      weeks = retry.weeks;
      title = retry.title || title;
      modelUsed = retry.modelUsed;
    }
  }

  // Final reconciliation. Truncate excess; pad shortfall with
  // consolidation weeks so the user is never blocked by a flaky model.
  if (weeks.length > input.durationWeeks) {
    weeks = weeks.slice(0, input.durationWeeks);
  } else if (weeks.length < input.durationWeeks) {
    const padded = padWeeks(weeks, input.durationWeeks, months, input.topic);
    log.warn("plan.outline.padded", {
      got: weeks.length,
      padded_to: padded.length,
      topic: input.topic,
    });
    weeks = padded;
  }

  return {
    title:
      title && title.trim().length > 0
        ? title.trim()
        : `${input.topic} — ${input.durationWeeks} weeks`,
    weeks,
    modelUsed,
  };
}

interface OutlineCallParams {
  cfg: ProviderConfig;
  input: OutlineInput;
  months: number;
  strict: boolean;
}

interface OutlineCallResult {
  weeks: OutlineWeek[];
  title: string;
  modelUsed: string;
}

async function callOutlineLLM(
  params: OutlineCallParams,
): Promise<OutlineCallResult> {
  const { cfg, input, months, strict } = params;

  // Explicit week-by-week scaffolding anchors the model in the exact
  // count we want. Smaller models honour structured examples far more
  // reliably than free-text rules.
  const exampleWeeks = Array.from({ length: input.durationWeeks }, (_, i) => {
    const wn = i + 1;
    const mn = Math.min(months, Math.ceil(wn / 4));
    return `    { "weekNumber": ${wn}, "monthNumber": ${mn}, "theme": "...", "goal": "..." }`;
  }).join(",\n");

  const strictPreamble = strict
    ? `CRITICAL: Your previous attempt returned the wrong number of weeks. You MUST output every single week from 1 through ${input.durationWeeks}. Do not stop early. Do not skip. Count them as you write.\n\n`
    : "";

  const systemPrompt = `${strictPreamble}You design multi-month personal growth plans.

You will produce a plan outline as JSON. Each week has ONE theme and ONE concrete weekly goal — the daily tasks are generated separately later, so do NOT list tasks here.

Hard rules:
- Output EXACTLY ${input.durationWeeks} week objects in the "weeks" array — no more, no less.
- weekNumber values must be 1, 2, 3, …, ${input.durationWeeks} with no gaps.
- monthNumber is 1..${months} (weekNumber 1-4 = month 1, 5-8 = month 2, …).
- Theme = a short noun phrase (e.g. "JavaScript fundamentals", "Long-run base building", "Conversational vocabulary").
- Goal = one specific sentence about what the learner will be able to do/produce by the end of that week.
- Build progressively. Week N should depend on weeks 1..N-1.
- Every 4th week (4, 8, 12, …) should be a CHECKPOINT/CONSOLIDATION week — apply what they've learned, not new material.
- Tailor difficulty to the user's stated current level and hours/day.
- Tailor format to the user's preferred learning style (videos / reading / projects / mixed).

Output STRICT JSON only with EXACTLY ${input.durationWeeks} entries in "weeks":
{
  "title": "<short, specific plan title — not generic>",
  "weeks": [
${exampleWeeks}
  ]
}`;

  const userMessage = `Design a plan with EXACTLY ${input.durationWeeks} weeks:
- Topic: ${input.topic}
- End goal: ${input.goal}
- Current level: ${input.currentLevel}
- Available time: ${input.hoursPerDay} hour(s)/day
- Preferred learning style: ${input.learningStyle}
- Duration: ${input.durationWeeks} weeks (${months} months)

Return JSON with ${input.durationWeeks} week objects, weekNumber 1 through ${input.durationWeeks}.`;

  const { text, modelUsed } = await chatJSON(cfg, {
    system: systemPrompt,
    user: userMessage,
    // Headroom for long plans: ~250 tokens/week + structural overhead.
    maxTokens: Math.max(2048, input.durationWeeks * 300 + 512),
    temperature: strict ? 0.3 : 0.6,
  });

  // Tolerant parse: on failure we return zero weeks so generatePlanOutline's
  // retry + padding logic recovers instead of hard-failing the whole plan.
  const parsed =
    parseJsonLoose<Partial<{ title: string; weeks: unknown }>>(text) ?? {};

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

  return {
    weeks,
    title: typeof parsed.title === "string" ? parsed.title : "",
    modelUsed,
  };
}

/**
 * Fills any missing week numbers with auto-generated consolidation entries.
 * Preserves the LLM's output for the weeks it did produce; only the gaps
 * are filled. Ensures the user is never blocked by a model that stops short.
 */
function padWeeks(
  existing: OutlineWeek[],
  total: number,
  months: number,
  topic: string,
): OutlineWeek[] {
  const byNumber = new Map<number, OutlineWeek>();
  for (const w of existing) byNumber.set(w.weekNumber, w);

  const filled: OutlineWeek[] = [];
  for (let i = 1; i <= total; i++) {
    const existingWeek = byNumber.get(i);
    if (existingWeek) {
      filled.push(existingWeek);
      continue;
    }
    const mn = Math.min(months, Math.ceil(i / 4));
    const isCheckpoint = i % 4 === 0;
    filled.push({
      weekNumber: i,
      monthNumber: mn,
      theme: isCheckpoint
        ? `${topic} — consolidation`
        : `${topic} — week ${i}`,
      goal: isCheckpoint
        ? "Review and apply what you've learned in the previous three weeks."
        : "Continue progressing on the plan goals. Revisit any open items from earlier weeks.",
    });
  }
  return filled;
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
  cfg: ProviderConfig,
  input: WeekTaskInput,
): Promise<WeekTasksOutput> {
  // Daily task budget: ~1 task per (hours/day × 60 / 30min avg). Cap at 7.
  const tasksPerDay = Math.max(1, Math.min(4, Math.round(input.hoursPerDay * 1.5)));
  const tasksThisWeek = tasksPerDay * 6; // 6 active days (Sunday is rest)

  const allowedCategories = new Set([
    "technical",
    "personal-growth",
    "checkpoint",
  ]);

  function buildSystemPrompt(strict: boolean): string {
    const strictPreamble = strict
      ? `CRITICAL: Respond with ONE valid JSON object and NOTHING else — no markdown, no code fences, no commentary, no <think> blocks. A previous attempt could not be parsed.\n\n`
      : "";
    return `${strictPreamble}You write specific, beginner-friendly daily tasks for one week of a multi-month plan.

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
  }

  const userMessage = `Generate the ${tasksThisWeek} tasks for week ${input.weekNumber}.`;

  async function attempt(
    useModel: string,
    strict: boolean,
    temperature: number,
  ): Promise<{ tasks: GeneratedTask[]; modelUsed: string }> {
    const { text, modelUsed } = await chatJSON(
      { ...cfg, model: useModel },
      {
        system: buildSystemPrompt(strict),
        user: userMessage,
        // Headroom so a full week (up to 24 tasks) isn't truncated mid-JSON.
        maxTokens: 4096,
        temperature,
      },
    );

    const parsed = parseJsonLoose<{ tasks?: unknown }>(text);
    const tasks: GeneratedTask[] = Array.isArray(parsed?.tasks)
      ? (parsed.tasks as unknown[])
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

    return { tasks, modelUsed };
  }

  // Resilience: try the configured model (loose → strict). For OpenRouter
  // (free models that intermittently emit prose/truncated JSON), also fall
  // back to two known-reliable free models. Paid providers (OpenAI/Anthropic/
  // Google) are reliable for JSON, so loose+strict on the chosen model is
  // enough — we don't switch to another provider (we only hold one key).
  const attempts: Array<{ model: string; strict: boolean; temperature: number }> = [
    { model: cfg.model, strict: false, temperature: 0.6 },
    { model: cfg.model, strict: true, temperature: 0.2 },
  ];
  if (cfg.provider === "openrouter") {
    for (const m of ["openai/gpt-oss-20b:free", "openai/gpt-oss-120b:free"]) {
      if (m !== cfg.model) {
        attempts.push({ model: m, strict: false, temperature: 0.5 });
        attempts.push({ model: m, strict: true, temperature: 0.2 });
      }
    }
  }

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    try {
      const { tasks, modelUsed } = await attempt(a.model, a.strict, a.temperature);
      if (tasks.length > 0) {
        if (i > 0) {
          log.warn("plan.week.recovered", {
            attempt: i + 1,
            model: a.model,
            taskCount: tasks.length,
          });
        }
        return { tasks, modelUsed, adjustmentNotes: input.adjustmentNotes ?? "" };
      }
      log.warn("plan.week.unparsed_or_empty", { attempt: i + 1, model: a.model });
    } catch (err) {
      lastError = err;
      log.warn("plan.week.attempt_failed", {
        attempt: i + 1,
        model: a.model,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw (
    lastError ??
    new Error("LLM returned no parseable tasks for the week after retries")
  );
}
