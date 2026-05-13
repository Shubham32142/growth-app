# GrowthPath — Personal Growth Companion App

> **⚠ Architecture pivot (Sprint 8, 2026-05-13):** the original spec described
> a static plan parsed from `6-month-developer-plan.md` via an importer. That
> pattern has been replaced by **per-user AI-generated plans** driven by a
> 5-question wizard. The curated markdown is now an optional "template"
> preset on `/plans/new`. Database moved from MongoDB → Supabase Postgres,
> auth moved from NextAuth → Supabase Auth. See `CLAUDE.md` for the live
> stack and the "Decisions locked in" table below for the current choices.
> Sections describing the old importer flow are kept as historical context.

> **What this document is:** a complete product + technical spec, written
> as the durable context you hand to an AI coding agent (Claude Code,
> Cursor, etc.) when building this app. It is the source of truth so the
> AI doesn't drift, hallucinate stack choices, or invent features.
>
> **What it's not:** a learning exercise. You're building this now, with
> AI assistance, to actually use it. The goal is shipped software, not
> studied software.
>
> **Audience:** App is for *anyone* executing a multi-month growth plan,
> not only developers. The 6-month-developer-plan.md is just the **first
> seeded plan template** in the system.

---

## Context

A detailed 6-month-developer-plan.md exists that maps out 24 weeks of
learning. The risk with any self-directed plan is friction: every day you
have to decide *what to do, where to find resources, and whether you're
on track*. That decision-cost compounds and is why most self-taught
learners quit by Month 3 (the plan itself calls this out).

This app removes that friction. Each morning it serves you the day's tasks
pulled from the plan, fetches **real, current, beginner-friendly** resources
per task (search-grounded, not LLM-imagined), you mark tasks complete, and
the app tracks streak + 0→100 progress. A weekly Sunday recap
(AI-generated, animated) celebrates wins and surfaces what to improve. The
architecture is plan-agnostic from day 1 so the same app can power a
fitness plan, a language-learning plan, etc., once the dev-plan use case
is validated with a small group.

---

## How to use this spec with AI

When pointing an AI coding agent at this project:

1. Place this file at the repo root as `SPEC.md` (alongside `CLAUDE.md`
   for repo-specific conventions).
2. The first instruction to the AI should always be: *"Read SPEC.md
   end-to-end before touching code. If anything in my request conflicts
   with SPEC.md, flag it before proceeding."*
3. When asking for a feature, reference the **section + bullet** in this
   file. E.g., *"Implement section 'AI resources' bullet 2 — search
   grounding via Tavily."* This prevents the AI from inventing scope.
4. Update this file *before* changing the code when requirements shift.
   This file leads, code follows.
5. The "Decisions locked in" table is non-negotiable unless explicitly
   amended here. AI should never silently swap stack choices.
6. **After every set of changes, the AI must update `progress.md`** —
   see the "Progress tracking rule" section below. This is mandatory,
   not optional.

---

## Progress tracking rule (MANDATORY)

A file named `progress.md` lives at the repo root. It is the running
ledger of how far the build has gotten — anyone (you, a friend, a future
AI session) can open it and instantly see what is done, what is in
progress, and what is next.

**Rules for the AI agent:**

1. **Every change-set updates `progress.md`.** A "change-set" = any time
   the AI finishes a logical unit of work (a feature, a bug fix, a
   refactor, a setup step). Before reporting "done" to the user, the AI
   must edit `progress.md` to reflect the new state.
2. **Update format:** flip the status emoji on affected sprint items, and
   append a new dated entry to the "Recent updates" log at the bottom.
3. **Status emojis:** ⬜ not started · 🟡 in progress · ✅ done · ⚠️ blocked.
4. **Granularity:** each sprint has sub-items. Tick sub-items individually
   as they land — do not wait for the whole sprint.
5. **No silent updates.** Each "Recent updates" entry includes: date,
   sprint number, one-line description, and (if applicable) a percentage
   delta on the overall completion bar.
6. **Truth over optimism.** If something half-works, mark it 🟡, not ✅.
   If a test fails, mark the parent ⚠️ and note the blocker.
7. **The user can ask "where are we?" at any time.** The answer is
   always: read `progress.md`. If `progress.md` doesn't answer the
   question, the file is wrong — fix it.

The first version of `progress.md` is created during Sprint 0. Its
template is in the "Initial progress.md template" section at the bottom
of this spec.

---

## Decisions locked in

| Area | Choice |
|---|---|
| Audience v1 | You + a few friends (private). Public SaaS is a later-stage stretch. |
| Platform | Web (responsive) — Next.js App Router |
| Package manager / runtime | **Bun** (not pnpm/npm). `bun install`, `bun dev`, `bun run`. |
| Tech stack | TypeScript 5.x, Next.js 16 (App Router + RSC), React 19, Tailwind CSS 4, shadcn-style primitives, Framer Motion, Drizzle ORM, postgres-js, Recharts, Zod 3+. |
| Database | **Supabase Postgres** (free tier) with Drizzle ORM. `auth.users` managed by Supabase Auth; all user-owned tables protected by RLS policies (`auth.uid() = user_id`). Migrations live in `supabase/migrations/*.sql` and apply via `bun run db:apply`. |
| Auth | **Supabase Auth** (cookie-based, replaces NextAuth). Email+password + Google OAuth configured in the Supabase dashboard. `lib/auth.ts` is a thin shim that wraps the Supabase session in `{ user: { id, email, name, image } }`. |
| AI — text generation | OpenRouter API, **free-tier models only**, model name configurable from an in-app admin screen. Three roles: (1) outline generation, (2) weekly task generation (with completion-based adaptation), (3) recap generation, (4) resource ranking. |
| AI — resource grounding | Web search API (Tavily free tier; fallback Brave Search free tier) — fetches **real current URLs**, AI then filters/ranks for beginner-friendliness. We never let the LLM invent URLs. |
| **Tasks source** | **AI-generated per user via a 5-question wizard** at `/plans/new/wizard`. The plan outline (weeks × themes) is generated up-front; each week's task batch is generated lazily (cron + on-visit fallback) with completion-based adaptation. The curated `6-month-developer-plan.md` is preserved as a no-LLM "template" preset on `/plans/new` for users who want the proven path. |
| Plan duration | User picks 3 / 6 / 9 months or custom (4-52 weeks) on `/plans/new`. Stored as `plans.duration_weeks`. |
| Streak | Forgiving — Sundays free, +1 skip/week pardoned |
| Theme | Calm dark mode only: slate-950 / slate-900 / emerald-400 / amber-400 |
| Deploy | Vercel (app) + Supabase (db + auth) + Vercel Cron (weekly task regen) — all free tier |

---

## Feature list (v1)

**Core (must ship)**
1. Email+password auth + Google OAuth via **Supabase Auth**
2. **Per-user AI-generated plans** — 5-question wizard (`topic`, `goal`, `currentLevel`, `hoursPerDay`, `learningStyle`) + duration picker (3/6/9/custom weeks). The curated 6-month dev plan is preserved as a one-click "template" preset.
3. Daily task feed: show only today's scheduled tasks for the user's active plan, grouped into clear learning buckets for focus
4. Mark complete → updates progress (0–100%), streak, and energy log
5. **Grounded resources per task** — three-tier strategy to prevent AI hallucination:
   - **Tier 1 (always present): curated baseline.** Each task is seeded at import time with hand-picked links extracted from the plan's "Resources" section + a known-good map of authoritative sources per topic (MDN, freeCodeCamp, official docs, OWASP, Anthropic docs, ByteByteGo, NeetCode, etc.). These never go stale because they point to canonical homes.
   - **Tier 2 (on-demand, search-grounded): fresh results.** When the user clicks "Find more resources," the backend calls the Tavily Search API with a tuned query (`{task.title} tutorial beginner 2026 site:dev.to OR site:youtube.com OR site:freecodecamp.org`) — this returns *real* URLs with snippets. The LLM **only filters and ranks** these results — it never generates URLs. Output schema forces the model to pick from the input list.
   - **Tier 3 (community): user-submitted resources.** Logged-in users can submit + upvote a link per task. Top-voted user submissions surface alongside Tier 1.
   - All resources are cached per-task in the DB with a 30-day TTL on Tier 2 results. Stale Tier 2 entries auto-refresh on next view.
6. Forgiving streak system (Sundays free, 1 weekly pardon)
7. Wins journal — Friday prompt to log 3 wins; reviewable list
8. Energy tracker — 1–5 rating popover on task complete; shown on a weekly chart
9. Weekly recap — every Sunday evening, AI generates a personalized recap of the week (achievements, growth, improvements, encouragement) with a celebratory Framer Motion animation
10. Admin settings screen — pick/enter OpenRouter model name (free tier list pre-populated as quick presets)

**Out of scope for v1 (parking lot)**
- Public landing page, pricing, billing
- Mobile push notifications (PWA can come Month 4)
- Multi-plan enrollment (one active plan per user in v1)
- Social features (friends' progress, leaderboards)
- 5-5-5 networking checklist (add Month 2 if you want it)

---

## Architecture overview

```
┌────────────────────────────────────────────────────────┐
│  Next.js (App Router) — single deployable on Vercel    │
│                                                         │
│  app/                                                   │
│   ├── (auth)/sign-in, sign-up                          │
│   ├── (app)/today          ← daily task feed (home)    │
│   ├── (app)/progress       ← progress + streak         │
│   ├── (app)/wins           ← wins journal              │
│   ├── (app)/recap/[week]   ← weekly recap w/ animation │
│   └── (app)/admin          ← model picker, plan import │
│                                                         │
│  app/api/                                               │
│   ├── auth/[...nextauth]   ← NextAuth handlers         │
│   ├── tasks/[id]/complete  ← POST mark complete        │
│   ├── tasks/[id]/resources ← GET (cached) AI resources │
│   ├── recap/[week]         ← POST generate weekly recap│
│   ├── wins                 ← GET/POST journal entries  │
│   └── admin/settings       ← GET/PATCH AI model config │
│                                                         │
│  lib/                                                   │
│   ├── db.ts                ← Mongoose connection       │
│   ├── auth.ts              ← NextAuth v5 config        │
│   ├── ai.ts                ← OpenRouter client wrapper │
│   ├── search.ts            ← Tavily / Brave wrapper    │
│   ├── topic-map.ts         ← Tier 1 seed source map    │
│   ├── streak.ts            ← streak calc (pure fn)     │
│   ├── progress.ts          ← % calc (pure fn)          │
│   └── plan-importer.ts     ← markdown → DB             │
│                                                         │
│  scripts/                                               │
│   └── import-dev-plan.ts   ← run once, re-runnable     │
└────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│  MongoDB Atlas M0 (free 512MB)                          │
│  Collections: users, accounts, sessions (NextAuth)      │
│               plans, tasks, enrollments, completions,   │
│               resources, wins, energyLogs, recaps,      │
│               settings                                  │
└────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│  OpenRouter API — free models (configurable)           │
│  + Tavily Search API (resource grounding, real URLs)    │
└────────────────────────────────────────────────────────┘
```

---

## Data model (Mongoose schemas)

```ts
// Plan template — the 6-month dev plan is one of these
Plan {
  _id, slug ("6-month-developer-plan"), title, description,
  durationWeeks: 24, isPublic: true, createdBy
}

// One plan has many weeks → each week has many tasks
Task {
  _id, planId, weekNumber (1-24), monthNumber (1-6),
  section ("Week 1: Language Mastery"), title, body (markdown),
  category ("technical" | "personal-growth" | "checkpoint"),
  order, estimatedMinutes
}

// User enrolls in a plan; one active enrollment per user in v1
Enrollment {
  _id, userId, planId, startDate, currentWeek (calculated),
  status ("active" | "paused" | "completed")
}

// Per-user task state — one row per (user, task) once acted on
Completion {
  _id, userId, taskId, enrollmentId,
  completedAt, energyRating (1-5, optional)
}

// Resources per task, three tiers, cached globally (not per user)
Resource {
  _id, taskId,
  curated: [{ title, url, type, summary, source }],     // Tier 1 — seeded at import, hand-picked, no TTL
  search:  [{ title, url, type, summary, snippet,       // Tier 2 — search-grounded, AI-ranked
              fetchedAt, modelUsed, searchProvider }],
  community: [{ submittedBy, title, url, votes,         // Tier 3 — user-submitted
                createdAt }],
  ttlDays: 30 // applies to `search` only
}
// type ∈ "article" | "video" | "doc" | "exercise" | "course"
// source ∈ "plan-resources-section" | "topic-map" | "tavily" | "brave" | "user"

// Wins journal — Friday entries
Win {
  _id, userId, weekNumber, entries: [string, string, string],
  createdAt
}

// Per-task energy ratings (denormalized for fast charts)
EnergyLog {
  _id, userId, taskId, rating (1-5), at
}

// Weekly AI recap — generated Sunday evening
Recap {
  _id, userId, weekNumber, content (markdown),
  achievements, growthAreas, improvements, modelUsed, createdAt
}

// App-wide settings (admin-editable)
Setting {
  _id, key ("openrouter.model"), value, updatedBy, updatedAt
}
```

**Streak rule (pure function in `lib/streak.ts`):**
- A "streak day" = ≥1 completion that day, OR Sunday (free), OR within the 1 weekly pardon.
- Streak breaks if a non-Sunday weekday has zero completions AND the weekly pardon is already used.
- Pardon resets every Monday 00:00 user-local time.

---

## Color tokens

```ts
// Tailwind theme tokens — these are the ONLY colors allowed in the UI
colors: {
  bg:        '#020617', // slate-950
  surface:   '#0f172a', // slate-900
  surface2:  '#1e293b', // slate-800
  border:    '#334155', // slate-700
  text:      '#e2e8f0', // slate-200
  textMuted: '#94a3b8', // slate-400
  accent:    '#34d399', // emerald-400 — progress, completion
  streak:    '#fbbf24', // amber-400 — streak counter, fire icon
  danger:    '#f87171', // red-400 — broken streak, errors
}
```
**Rule:** No other colors in the UI. Charts use accent + streak + neutral
slate shades only. No rainbow, no random gradients.

---

## Build sprints

Sprints are sized to be completed with AI assistance (Claude Code or Cursor)
working from this spec. Each sprint ends in a deployable, demoable state.

| Sprint | Output | Done when |
|---|---|---|
| **0. Foundation** | Bun-initialized Next.js repo, Tailwind 4 with theme tokens, Mongoose connection helper, `.env.example`, `SPEC.md` + `CLAUDE.md` + `progress.md` at root, deployed empty home page on Vercel | `bun dev` works locally; Vercel preview deploys on push; `/api/health` returns `{ ok: true, db: "connected" }`; `progress.md` exists and reflects sprint 0 done |
| **1. Plan importer** | `scripts/import-dev-plan.ts` parses `6-month-developer-plan.md` → seeds `Plan` + `Task` docs idempotently. Also seeds **Tier 1 curated resources** by extracting links from the plan's "Resources" section and matching topic keywords to a static `topic-map.ts` of authoritative sources. | Re-running the script produces zero duplicates. Atlas shows 1 Plan + ~150 Tasks + ~150 Resource docs (each with ≥3 curated items). |
| **2. Auth + today** | NextAuth v5 with email+password and Google OAuth, MongoDB adapter, `/today` server-rendered page listing the enrolled user's tasks for the current week | Sign up → Google sign-in → see today's tasks. Sessions persist across reload. |
| **3. Mark complete + progress + streak** | `POST /api/tasks/[id]/complete`, progress bar (0–100), forgiving streak counter, calendar heatmap | Streak unit tests pass for: normal day, Sunday rest, pardon used, pardon exhausted. Marking a task moves the progress bar live (optimistic UI). |
| **4. Grounded resources** | Tavily integration, OpenRouter ranking call, admin model-picker screen, three-tier resource UI (curated / search / community), 30-day cache | Click "Find more resources" on any task → real, working URLs return in <8s. Second click is instant (cache hit). Admin can swap models without redeploy. |
| **5. Wins + energy** | Friday wins prompt UI, energy rating popover on completion, `/progress` week-energy chart (Recharts) | Friday at 18:00 local → wins prompt auto-appears. Submitting wins persists. Energy chart renders. |
| **6. Weekly recap + daily focus mode** | Sunday evening recap generator (`POST /api/recap/[week]`), animated `/recap/[week]` page with Framer Motion celebration, shareable read-only link, and `/today` focus mode that shows only today's tasks grouped by category + inferred sub-bucket | Generating a recap with seeded fake completions returns markdown in <15s. Animation plays on first view. Shareable link works without auth. `/today` never shows full week/month task lists and only renders the current day slice. |
| **7. Polish + ship to friends** | Sentry integration, Lighthouse ≥90, error boundaries, empty states, polished README with screenshots, invite flow for early-access friends | 3+ friends are using it daily for one week without filing bugs that block flow. |

**v1 MVP = sprints 0–3.** Ship to friends after sprint 3, then layer 4–7
based on their feedback.

---

## Critical files to create

| Path | Purpose |
|---|---|
| `package.json` | Bun-managed. Always install **latest stable** at scaffold time (do not pin to outdated majors): `next`, `react`, `react-dom`, `mongoose`, `next-auth` (v5+), `@auth/mongodb-adapter`, `openai` (pointed at OpenRouter base URL), `@tavily/core` (or `tavily` SDK), `zod`, `tailwindcss` (v4+), `framer-motion`, `recharts`, plus shadcn/ui CLI scaffold. Dev deps: `typescript`, `@types/*`, `bun-types`, `vitest` (or `bun test`). |
| `app/layout.tsx` | Root layout, theme provider, font (Inter) |
| `app/(app)/today/page.tsx` | Daily task feed — server component reads enrollment, lists today's tasks |
| `app/(app)/progress/page.tsx` | Progress bar, streak, calendar heatmap |
| `app/(app)/wins/page.tsx` | Wins journal list + Friday prompt |
| `app/(app)/recap/[week]/page.tsx` | Animated weekly recap |
| `app/(app)/admin/page.tsx` | Settings (model picker), re-run plan import button |
| `app/api/tasks/[id]/complete/route.ts` | POST — create Completion, update streak/energy |
| `app/api/tasks/[id]/resources/route.ts` | GET — cached AI resource lookup |
| `app/api/recap/[week]/route.ts` | POST — generate Recap on demand |
| `lib/db.ts` | Mongoose connection singleton |
| `lib/auth.ts` | NextAuth v5 config + MongoDB adapter |
| `lib/ai.ts` | OpenRouter client (uses OpenAI SDK pointed at OpenRouter base URL); reads model from Setting collection |
| `lib/search.ts` | Tavily client wrapper; `searchForTask(task) → SearchResult[]`. Brave fallback if Tavily quota hit. |
| `lib/topic-map.ts` | Static map: `{ keyword: [{ title, url, type, source }] }` — used by importer to seed Tier 1 resources. E.g., `"sql"` → MDN/PostgreSQL docs/SQLZoo. |
| `lib/streak.ts` | `calculateStreak(completions, today)` — pure, unit-tested |
| `lib/progress.ts` | `calculateProgress(totalTasks, completedTasks)` — pure |
| `lib/plan-importer.ts` | Markdown parser → Plan + Task documents (idempotent upsert) |
| `models/*.ts` | Mongoose models for each collection above |
| `scripts/import-dev-plan.ts` | One-shot CLI: `bun run scripts/import-dev-plan.ts ../6-month-developer-plan.md` |
| `tailwind.config.ts` | Color tokens above |
| `.env.local.example` | `MONGODB_URI`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `BRAVE_SEARCH_API_KEY` |
| `CLAUDE.md` | Repo conventions for AI agents: stack, file layout, commit style, test command (`bun test`), how to run the importer, how to verify a sprint, and **the rule to update `progress.md` after every change-set**. |
| `progress.md` | Living build ledger. Updated after every change-set per the "Progress tracking rule" section. Template below. |
| `README.md` | What it does, how to run, screenshots (build for case study from day 1) |

---

## AI prompt design (key prompts saved as constants)

**Resource ranking prompt** (`lib/prompts/rank-resources.ts`) — note: the LLM **only ranks/filters real search results**. It does **not** invent URLs.
> System: You receive a JSON array of real search results. Return strictly JSON: `{ items: [{ id, type, summary }] }` where `id` is the index from the input array. Pick at most 5. Prefer free, current (≤2 years old where dated), beginner-friendly resources. Reject paywalled, marketing-heavy, or AI-spam content. Type ∈ {article, video, doc, exercise, course}. The `summary` is your one-sentence reason this resource is good for this learner.
> User: Task: `{task.title}` — `{task.body}`. Learner is on week `{n}` of `{plan.title}` and already knows: `{prior weeks summary}`. Search results to rank: `{tavilyResults JSON}`.

The backend then **looks up the picked indices in the original Tavily
result set** to construct the final resource list — the LLM's output is
indices + summaries only, never URLs.

**Weekly recap prompt** (`lib/prompts/recap.ts`):
> System: You are a warm, specific mentor. Celebrate the learner's actual completed tasks (don't be generic). Output sections: ## Achievements / ## How you've grown / ## To improve next week. End with one sentence of genuine encouragement. Markdown only.
> User: Week `{n}` completed tasks: `{list}`. Skipped: `{list}`. Energy avg: `{n}/5`. Wins logged: `{wins}`.

Both prompts run through whatever model the admin selected in `Setting`.

---

## Verification

After each sprint, verify end-to-end before moving on. **Every verified
step also updates `progress.md`.**

1. **Sprint 0**: `bun dev` shows the home page, `/api/health` returns `{ ok: true, db: "connected" }`, sign-in page renders with **only** the locked-in theme colors (run a quick scan: no hex outside the token list). `progress.md` exists at repo root.
2. **Sprint 1**: Run `bun run scripts/import-dev-plan.ts ../6-month-developer-plan.md`. In Atlas, verify 1 Plan doc, ~150 Task docs, ~150 Resource docs each with `curated.length ≥ 3`. Re-run the script: zero duplicates created.
3. **Sprint 2**: Sign up with email, sign in with Google, get redirected to `/today`. Today's tasks for week 1 appear. Sign out and back in — session restores.
4. **Sprint 3**: Click "mark complete" on a task → progress bar moves, streak shows 1. Skip Monday, complete Tuesday → streak shows 1 (pardon used). Skip Wednesday too → streak shows 0 (pardon exhausted). Sundays don't break the streak. Unit tests cover all four cases.
5. **Sprint 4**: Click "Find more resources" on any task → real working URLs return in <8s; click each, all load. Click a second time → instant (cache hit). Open one of the URLs from the search tier — it must actually exist (no 404s). Change OpenRouter model in `/admin` → next fetch uses new model (logs confirm).
6. **Sprint 5**: Friday at 18:00 local → wins prompt auto-appears. Submit 3 wins → persisted in DB and visible in `/wins`. Energy rating popover appears on each completion; chart on `/progress` shows the week's energy averages.
7. **Sprint 6**: On Sunday after 20:00 → "Generate this week's recap" CTA appears on `/today`. Click it → animated recap page renders within 15s. Recap text references **actual completed tasks** by name (not generic). Shareable link works in incognito. `/today` shows only today's tasks (deterministic Mon-Sat assignment by task order; Sunday rest day) and groups tasks by category + inferred sub-bucket.
8. **Sprint 7**: Lighthouse ≥90 across all categories on the Vercel URL. Sentry receives a test error. README has install + screenshots. Invite 3 friends — at least 2 complete a full week without filing a blocking bug.

---

## Open items to decide before Sprint 0

1. **Final app name.** Working name is "GrowthPath." Decide before buying a domain.
2. **Friends list for early access.** Pick 3–5 people; their MongoDB user docs get an `earlyAccess: true` flag for any future gating.
3. **Search provider signup.** Create a Tavily account (free tier: 1,000 searches/mo) and a Brave Search account (free tier: 2,000/mo) so both API keys are ready before Sprint 4.
4. **OpenRouter free-model shortlist.** Decide the 3–4 free model presets to surface in the admin dropdown. Suggested starting set (verify they're still on the free tier when you build): a strong instruct model, a coding-tuned model, and a fast/cheap option.

---

## Initial progress.md template

When Sprint 0 begins, the AI agent creates `progress.md` at the repo
root using this exact template (then keeps it updated thereafter):

````markdown
# GrowthPath — Build Progress

> Living ledger of how far the build has gotten. Updated after every
> change-set. See SPEC.md → "Progress tracking rule" for the rules.

**Overall completion:** 0% · **Current sprint:** 0 — Foundation · **Last updated:** YYYY-MM-DD

Status legend: ⬜ not started · 🟡 in progress · ✅ done · ⚠️ blocked

---

## Sprint 0 — Foundation ⬜
- ⬜ Bun-initialized Next.js repo
- ⬜ Tailwind 4 with theme tokens (slate / emerald / amber)
- ⬜ Mongoose connection helper (`lib/db.ts`)
- ⬜ `/api/health` returns `{ ok: true, db: "connected" }`
- ⬜ `.env.example` checked in
- ⬜ `SPEC.md`, `CLAUDE.md`, `progress.md` at root
- ⬜ Deployed to Vercel (preview URL works)

## Sprint 1 — Plan importer ⬜
- ⬜ `lib/plan-importer.ts` parses `6-month-developer-plan.md`
- ⬜ `lib/topic-map.ts` seeded with authoritative sources
- ⬜ `scripts/import-dev-plan.ts` is idempotent (re-run → zero dupes)
- ⬜ Atlas shows 1 Plan + ~150 Tasks + ~150 Resource docs (Tier 1 ≥3 each)

## Sprint 2 — Auth + today ⬜
- ⬜ NextAuth v5 + MongoDB adapter wired
- ⬜ Email+password sign-up/sign-in works
- ⬜ Google OAuth works
- ⬜ `/today` page renders today's tasks for the enrolled user
- ⬜ Sessions persist across reload

## Sprint 3 — Mark complete + progress + streak ⬜
- ⬜ `POST /api/tasks/[id]/complete` creates Completion
- ⬜ Progress bar (0–100) live-updates
- ⬜ Forgiving streak (`lib/streak.ts`) — Sundays free, 1 weekly pardon
- ⬜ Streak unit tests cover 4 cases (normal / Sunday / pardon used / pardon exhausted)
- ⬜ Calendar heatmap on `/progress`

## Sprint 4 — Grounded resources ⬜
- ⬜ Tavily client (`lib/search.ts`) with Brave fallback
- ⬜ OpenRouter ranking call (LLM filters, never invents URLs)
- ⬜ Admin model-picker screen at `/admin`
- ⬜ Three-tier resource UI (curated / search / community)
- ⬜ 30-day cache on Tier 2 results

## Sprint 5 — Wins + energy ⬜
- ⬜ Friday wins prompt auto-shows at 18:00 local
- ⬜ Wins persisted, listed at `/wins`
- ⬜ Energy popover on task completion
- ⬜ Recharts week-energy chart on `/progress`

## Sprint 6 — Weekly recap ⬜
- ⬜ `POST /api/recap/[week]` generates recap (uses real completion data)
- ⬜ Framer Motion celebration animation on `/recap/[week]`
- ⬜ Shareable read-only link works without auth

## Sprint 7 — Polish + ship ⬜
- ⬜ Sentry integration
- ⬜ Lighthouse ≥90 across all categories
- ⬜ Error boundaries + empty states
- ⬜ README with screenshots
- ⬜ 3 friends using it daily for one full week

---

## Recent updates

<!-- Newest entries on top. Format:
### YYYY-MM-DD — Sprint N — short title
- bullet of what changed
- bullet of what's next
- (optional) Overall completion: X% → Y%
-->

### YYYY-MM-DD — Sprint 0 — Project initialized
- Created `progress.md` from SPEC.md template
- Overall completion: 0% → 0% (no code yet, ledger live)
````
