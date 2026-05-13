# GrowthPath — Build Progress

> Living ledger of how far the build has gotten. Updated after every
> change-set. See SPEC.md → "Progress tracking rule" for the rules.

**Overall completion:** 97% · **Current sprint:** 7 — Polish + ship 🟡 · **Last updated:** 2026-05-13 (Phase A done)

### Sprint 7 phase plan

- ✅ **Phase A** — Stabilise (delete dead Mongo/NextAuth surface, verify build)
- ✅ **Phase B** — Request-level `cache()` on `auth()` + `getActivePlan()`, edge cache on `/share/[token]`
- ✅ **Phase C** — Zod schemas at API boundary (`lib/schemas/` + `parseBody` helper)
- ✅ **Phase D** — Postgres-backed sliding-window rate limit (no Redis) + security headers in `next.config.ts`
- ✅ **Phase E** — Structured JSON logger (`lib/log.ts`, no Sentry — Vercel captures stdout for free)
- ✅ **Phase F** — Account deletion + JSON data export + admin UI section
- 🟡 **Phase G** — Error boundaries + README done; deploy + invite friends still pending

### Sprint 8 — Pivot to AI-generated plans

- ✅ **8.0** — Drizzle schema redesign (per-user plans + plan_weeks + tasks×plan_week)
- ✅ **8.1** — SQL migrations regenerated + RLS rewritten for the new shape
- ✅ **8.2** — LLM prompts: `generatePlanOutline`, `generateWeekTasks` in `lib/ai.ts`
- ✅ **8.5** — Existing code adapted to new schema (`lib/today.ts`, `lib/plan.ts` replaces `lib/enrollment.ts`, all `/api` routes + server pages, reset flow rewired to `/api/plans/active DELETE`)
- ✅ **8.3** — Plan creation API: `/api/plans/template` + `/api/plans/create` (outline LLM) + `/api/plans/[id]/generate-week` (week-task LLM with completion-based adjustment context)
- ✅ **8.4** — Full flow: `/plans/new` duration picker (3/6/9/custom), `/plans/new/wizard` 5-question form, `/plans/new/generating` animated 2-step orchestrator
- ✅ **8.6** — Onboarding redirect via `requireActivePlan` + `/today → /plans/new` when no plan exists
- ✅ **8.7** — Weekly task regeneration (Vercel cron Sunday 20:00 UTC + lazy "Generate week N now" CTA on `/today`)
- ✅ **8.8** — SPEC.md pivot callout + Decisions Locked In updated + CLAUDE.md describes the cron flow

**Sprint 8 complete.** Roadmap resumes at Phase B (caching).

Status legend: ⬜ not started · 🟡 in progress · ✅ done · ⚠️ blocked

---

## Sprint 0 — Foundation 🟡 ← only Vercel deploy remaining

- ✅ Bun-initialized Next.js repo
- ✅ Tailwind 4 with theme tokens (slate / emerald / amber)
- ✅ Mongoose connection helper (`lib/db.ts`)
- ✅ `/api/health` returns `{ ok: true, db: "connected" }`
- ✅ `.env.example` checked in
- ✅ `SPEC.md`, `CLAUDE.md`, `progress.md` at repo root
- ⬜ Deployed to Vercel (preview URL works)

## Sprint 1 — Plan importer ✅

- ✅ `lib/plan-importer.ts` parses `6-month-developer-plan.md`
- ✅ `lib/topic-map.ts` seeded with authoritative sources
- ✅ `scripts/import-dev-plan.ts` is idempotent (re-run → zero dupes confirmed)
- ✅ Atlas: 1 Plan + 264 Tasks + 264 Resource docs (Tier 1 ≥3 each)

## Sprint 2 — Auth + today ✅

- ✅ NextAuth v5 + MongoDB adapter wired (`lib/auth.ts`)
- ✅ Email+password sign-up/sign-in works (`/sign-up`, `/sign-in`, `POST /api/auth/sign-up`)
- ✅ Google OAuth configured (requires live env keys)
- ✅ `/today` page renders current-week tasks for the enrolled user (auto-enrolls on first visit)
- ✅ Sessions persist across reload (JWT strategy)

## Sprint 3 — Mark complete + progress + streak ✅

- ✅ `POST /api/tasks/[id]/complete` + `DELETE` (toggle, idempotent)
- ✅ Progress bar (0–100) live-updates via optimistic UI (`useOptimistic`)
- ✅ Forgiving streak (`lib/streak.ts`) — Sundays free, 1 weekly pardon
- ✅ Streak unit tests: 4/4 pass (normal / Sunday / pardon used / pardon exhausted)
- ✅ Calendar heatmap + streak stats + weekly/overall bars on `/progress`

## Sprint 4 — Grounded resources ✅

- ✅ `lib/search.ts` — Tavily client with curated include_domains (no Brave, it's paid)
- ✅ `lib/ai.ts` — OpenRouter wrapper; LLM only filters/ranks real URLs, never invents them
- ✅ `GET /api/tasks/[id]/resources` — Tier 2 cached 30 days, auto-refresh on stale
- ✅ `GET|PATCH /api/admin/settings` — persist active OpenRouter model in DB
- ✅ `/admin` model-picker — 5 free-tier presets + custom entry
- ✅ Three-tier resource panel on every task card (Tier 1 always shown, Tier 2+3 on demand)

## Sprint 5 — Wins + energy ✅

- ✅ Friday wins prompt auto-shows at 18:00 local
- ✅ Wins persisted, listed at `/wins`
- ✅ Energy popover on task completion
- ✅ Recharts week-energy chart on `/progress`

## Sprint 6 — Weekly recap + daily focus mode ✅

- ✅ `POST /api/recap/[week]` generates recap (uses real completion data)
- ✅ Framer Motion celebration animation on `/recap/[week]`
- ✅ Shareable read-only link works without auth
- ✅ `/today` shows only today's assigned tasks (not full week/month lists)
- ✅ Today's tasks are grouped by category + inferred sub-bucket labels (for focus)
- ✅ Deterministic daily assignment implemented (Mon-Sat by order, Sunday rest)
- ✅ Unit tests cover daily assignment + bucket inference behavior
- ✅ Calendar day preview added on `/today` (today/tomorrow/day-after + date picker)
- ✅ Non-today previews are read-only (no completion or submission actions)
- ✅ Repeated per-task resources collapsed into one daily resource section
- ✅ YouTube-first video suggestions added to daily resources
- ✅ Day selector redesigned to 5-day number + month strip (no Today/Tomorrow labels)
- ✅ Daily resources now open one direct video link (no YouTube search page)
- ✅ Daily resources now list multiple direct videos plus docs below

## Sprint 7 — Polish + ship 🟡

- ⬜ Sentry integration
- ⬜ Lighthouse ≥90 across all categories
- 🟡 Error boundaries + empty states (empty states added on Today + Wins + Recap; error boundaries still pending)
- ✅ Design system: shadcn-style primitives + AppShell sidebar nav + Tailwind v4 semantic tokens
- ✅ Landing page hero, auth two-column layout, refreshed screens for Today/Progress/Wins/Admin/Recap/Share
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

### 2026-05-13 — Phase B → G — Full free-tier production polish

**Phase B — Caching**
- `lib/auth.ts` + `lib/plan.ts` — wrapped `auth()` and `getActivePlan()` in React `cache()`. Single render now hits Supabase Auth + the plans table once even when 3+ helpers ask for them.
- `app/share/[token]/page.tsx` — `export const revalidate = 3600` so the public recap is edge-cached for an hour.

**Phase C — Zod at the API boundary**
- New `lib/schemas/` — `plan.ts`, `task.ts`, `wins.ts`, `admin.ts`, plus `parseBody(req, schema)` helper that returns either typed data or a structured 400 with field-paths.
- Refactored `/api/plans/create`, `/api/tasks/[id]/complete`, `/api/wins`, `/api/admin/settings` — every hand-rolled validation block gone, types inferred from the schemas.

**Phase D — Free-tier rate limit + security headers**
- New `rate_limit_hits` table (`supabase/migrations/0002_rate_limits.sql`) + `lib/ratelimit.ts` sliding-window helper. No Upstash, no Redis — uses Supabase Postgres.
- Applied to the 4 LLM-costly endpoints: `/api/plans/create` (5/hr/user), `/api/plans/[id]/generate-week` (12/hr), `/api/recap/[week]` (6/hr), `/api/tasks/[id]/resources` (30/hr).
- `next.config.ts` — CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS.

**Phase E — Structured logging (no paid service)**
- `lib/log.ts` emits single-line JSON to stdout/stderr. Vercel captures it free. Replaced `console.error` in plan-create + generate-week with `log.error("plan.outline.failed", err, { userId })`.

**Phase F — Account lifecycle**
- `DELETE /api/account` (`app/api/account/route.ts`) — uses `lib/supabase/admin.ts` (service-role client) to call `auth.admin.deleteUser(userId)`. ON DELETE CASCADE wipes profile + plans + plan_weeks + tasks + completions + energy_logs + resources + wins + recaps in one go.
- `GET /api/account/export` (`app/api/account/export/route.ts`) — streams a downloadable JSON of every row the user owns.
- Admin page — new "Your data" section with **Export my data** and **Delete my account…** (typed `DELETE` confirmation).

**Phase G — Error boundaries + README**
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — graceful failure UI at three levels.
- `README.md` rewritten as the canonical entry doc — stack, local setup, deploy steps, conventions, scripts.

**Validation**: `bun run lint` → **0 errors, 0 warnings**. `bun run build` → green, **30 routes**.

**Free-tier check**: no paid service required. Supabase free, Vercel free (incl. cron), OpenRouter free models, Tavily free, Postgres rate limit, console logs (Vercel free). No Upstash, no Sentry, no PlanetScale, no anything else.

**Remaining for Phase G**: deploy to Vercel + invite friends. That's a manual user step.

### 2026-05-13 — Sprint 8.7 + 8.8 — Weekly regen + spec/docs pivot

- New `app/api/cron/weekly-regen/route.ts` — Vercel-Cron-friendly endpoint that finds every active AI plan whose `currentWeek + 1` is not yet generated and runs `generateWeekTasks` with completion-based adjustment context (completion %, avg energy, sample skipped task titles). Authenticated by `Authorization: Bearer $CRON_SECRET`. Accepts both GET and POST.
- `vercel.json` — cron schedule `0 20 * * 0` (Sundays 20:00 UTC). Single entry; tune later if needed.
- `.env.local.example` — documented `CRON_SECRET` with a PowerShell-friendly generation snippet.
- `lib/today.ts` — surfaces three new fields on `TodayData`: `planId` (for the client to call the generate endpoint), `weekNeedsGeneration` (the plan_week exists but `tasksGeneratedAt = null`), and `weekInRange` (selected date sits inside the plan's duration). Now also runs a join to `plan_weeks` so we know the difference between "rest day", "outside plan", and "week is queued but empty".
- `TodayClient.tsx` — new "Week N isn't ready yet" CTA card that fires `POST /api/plans/[id]/generate-week?week=N` and reloads the day's data on success. Lives ahead of the empty-state branch so it never collides with "Sunday rest". Empty-state copy now distinguishes "outside your plan" from "no tasks scheduled".
- **SPEC.md** — added a top-of-file architecture-pivot callout, replaced the "Decisions locked in" rows (DB, Auth, Tasks source, Deploy), updated Feature #1 + #2 to reflect Supabase Auth + AI-generated plans.
- **CLAUDE.md** — Active stack section now describes `lib/ai.ts` plan-generation roles + the cron flow.
- Validation: `bun run lint` → **0 errors, 0 warnings**, `bun run build` → green, **27 routes**.
- Sprint 8 closed. Next: resume Sprint 7 Phase B (caching).

### 2026-05-13 — Sprint 8.3 + 8.4 — AI wizard flow shipped end-to-end

- New endpoint `POST /api/plans/create` (`app/api/plans/create/route.ts`):
  - Validates the 5 wizard inputs server-side
  - Refuses if user already has an active plan
  - Inserts plan row with `status='generating'`, calls `generatePlanOutline` (1 LLM call, ~5-15s), inserts plan_weeks
  - Updates plan title from the LLM's specific suggestion (vs generic `topic — N weeks`)
  - On LLM failure, rolls back the plan row so the user can retry cleanly
- New endpoint `POST /api/plans/[id]/generate-week?week=N` (`app/api/plans/[id]/generate-week/route.ts`):
  - Generates one week's tasks via `generateWeekTasks`
  - For week N>1, builds an `adjustmentNotes` context from prior week: total tasks vs completed, average energy, sample task titles → fed into the prompt for completion-based adaptation
  - Persists in a transaction (wipe old tasks → insert new batch with bumped `generation_version` → update plan_weeks.tasks_generated_at → for week 1 only, flip plan to `status='active'`)
- New page `/plans/new` (rewritten `PlanNewClient.tsx`):
  - Three duration cards (3 / 6 / 9 months) with framer-motion entrance + `layoutId` glow on selection
  - Custom-duration card with inline input (4-52 weeks)
  - Continue button enables once a duration is picked → goes to `/plans/new/wizard?d=N`
  - "Skip the wizard — use the curated dev plan" card below (kept the template flow)
- New page `/plans/new/wizard` (`WizardClient.tsx`):
  - 5 FieldCards stagger in: topic, goal, current level (3-option pills + freeform fallback), hours/day, learning style (4-card radio: Videos / Reading / Projects / Mixed)
  - Validates inline (button disabled until ready)
  - On submit, stashes inputs in sessionStorage and navigates to `/plans/new/generating`
- New page `/plans/new/generating` (`GeneratingClient.tsx`):
  - Reads inputs from sessionStorage (redirects back to /plans/new if missing)
  - 2-step status UI: "Designing your outline" → "Crafting week 1 tasks", with motion check-in animations
  - Failure state offers Retry → /plans/new/wizard or Back to start → /plans/new
  - On full success, fetches plan title for the success state, 1.2s linger, then `router.push("/today")`
- Validation: `bun run lint` → **0 errors, 0 warnings**, `bun run build` → green, **26 routes**
- Next: 8.7 — weekly task regeneration (cron route or lazy-on-visit at week boundary) + 8.8 (SPEC.md/CLAUDE.md updates), then resume the Phase B-G roadmap

### 2026-05-13 — Sprint 8.2 + 8.5 — Code adapted to AI-plan schema; template path live

- Added `lib/plan.ts` with `getActivePlan(userId)`, `requireActivePlan(userId)` (redirects to `/plans/new` when missing), `currentWeekFromPlan(plan, atDate)` — replaces the old `lib/enrollment.ts` and removes auto-enrollment magic.
- Added two LLM prompts to `lib/ai.ts`:
  - `generatePlanOutline({topic, goal, currentLevel, hoursPerDay, learningStyle, durationWeeks})` → `{ title, weeks[{weekNumber, monthNumber, theme, goal}] }`. Strict JSON, validates the LLM returned exactly N weeks, enforces "every 4th week is checkpoint", tailored to the user's stated level + hours + style.
  - `generateWeekTasks({weekTheme, weekGoal, ...userContext, adjustmentNotes?})` → calibrated task list. Sizes the batch from `hoursPerDay × 1.5` tasks/day × 6 working days. Honours the adjustment notes signal so completion-based adaptation can land in 8.7.
- `lib/today.ts` rewritten: now uses `getActivePlan` + `plan.durationWeeks` (no more hard-coded 24). `TodayData` carries `hasPlan` + `durationWeeks`; consuming components show the right "Week X of N".
- `lib/plan-importer.ts` becomes a per-user template instantiator (`instantiateTemplatePlanForUser`) — wraps plans + plan_weeks + tasks + resources insert in a single Drizzle transaction.
- Every API route updated for the new schema:
  - `/api/tasks/[id]/complete`: enrollment lookup → ownership check via `plans.user_id`
  - `/api/wins`: `wins` rows now carry `plan_id`; conflict target updated
  - `/api/recap/[week]` + share: scoped by `plan_id`, week range pulled from `plan.durationWeeks`
  - `/api/today`: empty state returned when no plan (client redirects via `hasPlan: false`)
  - New `/api/plans/active` (GET + DELETE) — used by the admin reset
  - New `/api/plans/template` — POST creates a template plan from the curated markdown
  - `/api/enrollment/reset` deleted; admin Danger Zone now calls `DELETE /api/plans/active` + redirects to `/plans/new`
- Server pages updated: `/today`, `/progress`, `/wins`, `/recap/[week]` use `requireActivePlan` and `plan.durationWeeks`. Week badges read the real plan duration instead of "of 24".
- Admin "Danger zone" copy/CTA updated to reflect the new semantics (delete plan + bounce to `/plans/new`).
- Stubbed `/plans/new` with the template card live (wizard card disabled — coming in 8.3/8.4). Animated with framer-motion.
- Deleted `lib/enrollment.ts`, `scripts/import-dev-plan.ts`, and the `import-plan` npm script. The CLI importer is replaced by the per-user POST `/api/plans/template`.
- `proxy.ts` + `lib/supabase/middleware.ts` matchers extended to cover `/plans/...`
- Validation: `bun run lint` → **0 errors, 0 warnings**, `bun run build` → green, 22 routes
- Next turn: 8.3 + 8.4 — the real duration picker + 5-question wizard + `/api/plans/create` LLM-driven flow + animated generating screen

### 2026-05-13 — Sprint 7 — Phase A — Stabilise (Mongo/NextAuth fully removed)

- Confirmed all old files were already deleted: `models/`, `lib/db.ts`, `app/api/auth/`, `types/next-auth.d.ts`
- Removed empty `types/` directory
- Uninstalled: `mongoose`, `next-auth`, `@auth/mongodb-adapter`, `bcryptjs`, `mongodb`, `@types/bcryptjs` — `package.json` deps now match what's actually imported
- Fixed the only remaining lint warning (`cursor` dead var in `lib/streak.ts`)
- Rewrote `CLAUDE.md` to declare the real stack (Supabase Postgres + Drizzle + Supabase Auth + RLS) so future sessions don't follow SPEC.md's outdated stack section
- Added Sprint 7 phase plan (A → G) to this file so the ledger reflects the actual roadmap
- Validation: `bun run lint` → **0 errors, 0 warnings**, `bun run build` → green, 21 routes
- Next: Phase B — caching

#### Smoke-test checklist (run before declaring "ready")

Run these against your Supabase project after `bun run db:apply` + `bun run import-plan`:

- [ ] `bun dev` starts cleanly
- [ ] `/api/health` returns `{ ok: true, db: "connected" }`
- [ ] Visit `/sign-up`, create an account with a fresh email — should land on `/today`
- [ ] In Supabase Studio: confirm `auth.users` has the new row AND `public.profiles` got auto-populated (via the `handle_new_user` trigger)
- [ ] On `/today`: tick a task → progress bar moves → reload → task stays ticked
- [ ] Open `/progress` → streak shows 1, week% reflects the toggle
- [ ] `/admin` → pick a different OpenRouter model → save → reload → selection persists
- [ ] `/admin` Danger Zone → reset plan with `RESET` confirmation → all rows for your user removed
- [ ] Open Supabase Studio → run `SELECT * FROM completions` with the **anon role** → returns zero rows even though service-role can see them (RLS proof)

### 2026-05-13 — Stage 2: full Postgres + Supabase Auth migration

- Ripped NextAuth + Mongoose. Auth contract preserved by shimming `lib/auth.ts` to read the Supabase server session and return the same `{ user: { id, email, name, image } }` shape — so every server component and API route that imports `auth()` keeps working.
- `proxy.ts` now delegates to `lib/supabase/middleware.ts` which refreshes the Supabase cookie on every request and gates protected routes.
- Sign-in / sign-up rewritten to use `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, and `supabase.auth.signInWithOAuth({ provider: 'google' })`. Added `/auth/callback` route to exchange the OAuth code for a session.
- Sidebar sign-out uses `supabase.auth.signOut()` via the browser client.
- Ported every persistence-touching file to Drizzle:
  - `lib/enrollment.ts`, `lib/today.ts`, `lib/ai.ts` (settings lookup), `lib/plan-importer.ts`, `lib/topic-map.ts`
  - Server pages: `/today` (via lib/today), `/progress`, `/wins`, `/recap/[week]`, `/share/[token]`
  - API routes: `/api/today`, `/api/tasks/[id]/complete`, `/api/tasks/[id]/resources`, `/api/wins`, `/api/recap/[week]`, `/api/recap/[week]/share`, `/api/share/[token]`, `/api/admin/settings`, `/api/enrollment/reset`, `/api/health`
- `/api/enrollment/reset` is now a single Postgres transaction — partial failure can't leave inconsistent state.
- `lib/db/client.ts` is a lazy Proxy so build-time module evaluation doesn't try to connect (placeholder DATABASE_URL no longer breaks `next build`).
- Removed deps: `mongoose`, `next-auth`, `@auth/mongodb-adapter`, `bcryptjs`, `@types/bcryptjs`
- Removed files: `models/`, `lib/db.ts`, `types/next-auth.d.ts`, `app/api/auth/`
- `app/providers.tsx` no longer wraps in `SessionProvider` (Supabase Auth is cookie-based)
- Validation: `bun run lint` → 0 errors (1 pre-existing warning), `bun run build` → green, 20 routes
- Next: user provides Supabase creds + runs `bun run db:apply` + `bun run import-plan`; then we test end-to-end

### 2026-05-13 — Sprint 7 — Wider day strip + tasteful animations

- Day strip: jumped from 7 → 14 days (`-7 / today / +6`), full-width via `flex-1 basis-0` so chips span the container instead of taking ~half
- Day strip selection is now an animated pill (`motion.span` + `layoutId="today-strip-pill"`); selected day updates optimistically before the API responds
- Today body wraps in `AnimatePresence` keyed on `dateISO` — fade/slide-up on day change
- Task items: stagger fade-up via `motion.li` with index-based delay; check icon scales in with a spring
- Sidebar active nav uses `motion.span` + `layoutId="sidebar-active"` so the highlight slides between routes
- Mobile drawer + overlay animate in/out with spring transition
- `components/ui/progress.tsx` now animates fill from 0 → value on mount via framer-motion (smooth easing)
- Added `components/motion-fade-up.tsx` — small `FadeUp` wrapper for one-shot entrance animations from server components
- Progress page stat cards + week/overall cards stagger in via `FadeUp`
- Validation: `bun run lint` → 0 errors, `bun run build` → green, 21 routes

### 2026-05-13 — Sprint 7 — Move date out of URL into client state

- `/today` is now the only front-end route; date selection lives in client state, not the URL
- Extracted shared data loader into `lib/today.ts` (`loadTodayData`, `parseDateParam`, `dateKey`, `shiftDays`); used by both SSR and the API
- Added `GET /api/today?date=YYYY-MM-DD` returning the same `TodayData` shape (week, tasks, streak, isPast/isFuture, etc.)
- Split the page into a server shell (`app/(app)/today/page.tsx`) and a client component (`TodayClient.tsx`) — initial paint is SSR for "today", subsequent day switches fetch the API and keep `/today` in the address bar
- Day strip, prev/next, and "Jump to today" are now buttons (no URL change); midnight rollover handled via `visibilitychange` rehydrate when viewing today
- Removed `/today/[date]/page.tsx` and the old `TodayView.tsx`
- `proxy.ts` matcher unchanged (still safe with `/today/:path*`)
- Validation: `bun run lint` → 0 errors, `bun run build` → green, 21 routes
- Next: pick a recommendation (onboarding / per-task notes / account & delete)

### 2026-05-13 — Sprint 7 — Path-param dates, past-day back-fill, plan reset

- Extracted shared `TodayView` server component (`app/(app)/today/TodayView.tsx`) from the existing page so both `/today` and `/today/[date]` render through one path
- Added `app/(app)/today/[date]/page.tsx` — invalid dates redirect to `/today`, and `/today/<today-iso>` normalises back to `/today` for clean URLs
- Day strip now centres on the selected date (±3 days) so history navigation keeps context
- Past dates are editable (back-fill) while future dates remain read-only previews; clear "Past day / Today / Upcoming day" headings and a "Jump to today" link when off-current
- Updated `POST /api/tasks/[id]/complete` to accept optional `at: YYYY-MM-DD` for back-fills; validates format, rejects future dates, writes `completedAt`/EnergyLog `at` accordingly
- Added `POST /api/enrollment/reset` — wipes Completions/EnergyLogs/Wins/Recaps for the current user and resets the active enrollment's `startDate = now`
- Added "Danger zone — Reset plan" section to `/admin` with typed `RESET` confirmation, success summary, and cancel
- Validation: `bun run lint` → 0 errors, `bun run build` → green, 22 routes (incl. new `/today/[date]` + `/api/enrollment/reset`)
- Next: pick from feature recommendations (onboarding, per-task notes, account/profile + delete, carry-forward)
- Overall completion: 97% → 97% (UX/maintenance gain, no new sprint scope)

### 2026-05-13 — Sprint 7 — Design system + full UI/UX refresh

- Added shadcn-style primitive components in `components/ui/` (Button, Card, Input, Label, Progress, Badge, Separator, Avatar) with `cn` utility (`lib/cn.ts`)
- Wired SPEC color tokens into Tailwind v4 `@theme` semantic aliases (`bg-card`, `text-primary`, `border-border`, etc.) so utilities replace inline styles
- Added `bg-grid-faint` + `glow-accent` utilities and base layer in `globals.css`
- Built new `components/app-shell.tsx` — desktop sidebar + mobile drawer with proper nav (Today / Progress / Wins / Settings), user chip, sign-out
- Replaced `app/(app)/layout.tsx` to use the new AppShell
- Redesigned landing page `app/page.tsx` — hero, feature grid, CTA strip (replaces the Sprint-0 placeholder)
- Redesigned `app/(auth)/layout.tsx` as a two-column hero with marketing panel on desktop
- Rebuilt sign-in and sign-up screens with shadcn Input/Label/Button/Separator + better empty/error states
- Rebuilt `/today` (TaskList + page): proper streak/progress card, day strip, grouped task cards, energy popover, resource columns
- Rebuilt `/progress` with stat cards + week/overall cards + heatmap + energy chart
- Rebuilt `/wins`, `/admin`, `/recap/[week]`, and public `/share/[token]` using shadcn primitives
- Installed `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`
- Validation: `bun run lint` → 0 errors (2 pre-existing warnings), `bun run build` → green, all 20 routes compile
- Next: Sentry, error boundaries, README screenshots, ship to friends
- Overall completion: 96% → 97%

### 2026-05-02 — Sprint 6 — Daily focus mode shipped on /today

### 2026-05-02 — Sprint 6 — Today UX refinement (calendar + video-first resources)

### 2026-05-02 — Sprint 6 — Day strip + direct video link UX update

### 2026-05-02 — Sprint 6 — Day strip alignment polish

### 2026-05-02 — Sprint 6 — Weekly recap + shareable link shipped

- Added `models/Recap.ts` (weekNumber, content, achievements, growthAreas, improvements, shareToken)
- Added `generateRecap()` to `lib/ai.ts` — uses real completion + wins data; LLM returns structured JSON
- Added `POST|GET /api/recap/[week]` — generates/fetches per-user recap, upserts in DB
- Added `POST /api/recap/[week]/share` — creates sparse share token (idempotent)
- Added `GET /api/share/[token]` — returns recap data with no auth required
- Added `/recap/[week]` page with Framer Motion entrance + celebration animation
- Added `/share/[token]` public read-only recap page (outside auth route group)
- Added "Week recap →" link on `/progress` page pointing to current week
- Installed framer-motion@12.38.0
- Build passes cleanly: 21 routes
- Next: Sprint 7 — polish + ship (Sentry, Lighthouse, error boundaries, README)
- Overall completion: 89% → 96%

### 2026-05-02 — Sprint 6 — Multi-video + docs resources layout

- Expanded daily resources to show multiple direct videos (curated videos + bucket-based video fallbacks)
- Added docs list below videos for optional reading in the same section
- Removed single-video-only limitation while keeping direct-link behavior (no search pages)
- Validation: `bun run build` passes
- Next: complete Sprint 6 weekly recap endpoint + animated recap page + shareable read-only view
- Overall completion: 88% → 89%

### 2026-05-02 — Sprint 6 — Day strip alignment polish

- Removed the day selector wrapper background/border card for a cleaner look
- Center-aligned the 5-day selector strip and preview note text
- Validation: diagnostics show no errors in updated page file
- Next: complete Sprint 6 weekly recap endpoint + animated recap page + shareable read-only view
- Overall completion: 87% → 88%

### 2026-05-02 — Sprint 6 — Day strip + direct video link UX update

- Replaced the date input/button/today-tomorrow links with a 5-day clickable strip showing day number and month only
- Updated daily resources to provide one direct video link for the selected day instead of YouTube search result links
- Kept future-day previews read-only while allowing AI/task preview behavior
- Validation: `bun test` and `bun run build` both pass
- Next: complete Sprint 6 weekly recap endpoint + animated recap page + shareable read-only view
- Overall completion: 86% → 87%

### 2026-05-02 — Sprint 6 — Today UX refinement (calendar + video-first resources)

- Added a calendar/date selector above tasks with quick links for tomorrow and day after tomorrow
- Day previews now compute week by selected date and enforce read-only mode for non-today dates
- Removed repeated per-task resource cards and replaced them with one consolidated daily resources section
- Added YouTube-first video suggestions generated from daily task buckets/titles, with docs moved to optional references
- Validation: `bun test` and `bun run build` both pass
- Next: complete Sprint 6 weekly recap endpoint + animated recap page + shareable read-only view
- Overall completion: 84% → 86%

### 2026-05-02 — Sprint 6 — Daily focus mode shipped on /today

- Updated `SPEC.md` and `growthpath/START_HERE.md` to place today-only bucketed focus mode in Sprint 6 scope
- Added `lib/today-focus.ts` with deterministic Mon-Sat assignment + Sunday rest behavior
- Refactored `/today` to render only today's scheduled tasks and infer sub-buckets from task content
- Updated `TaskList` to group daily tasks by category and sub-bucket while preserving completion/energy/resource flows
- Added `__tests__/today-focus.test.ts`; full suite passes (`bun test`), and production build passes (`bun run build`)
- Next: finish Sprint 6 recap endpoints/page/share flow
- Overall completion: 79% → 84%

### 2026-05-02 — Sprint 5 — Wins journal + energy tracking shipped

- Added `models/Win.ts` and `models/EnergyLog.ts` for weekly wins and per-task energy logs
- Added `GET|POST /api/wins` and `/wins` page with editable 3-win weekly journal + history list
- Updated `POST /api/tasks/[id]/complete` to accept optional `energyLevel` (1-5) and persist energy logs
- Added Friday 18:00 local wins prompt in `/today` when the current week has no wins entry
- Added weekly Recharts energy chart on `/progress` sourced from stored energy logs
- Build passes cleanly after changes (`bun run build`)
- Next: Sprint 6 — AI weekly recap generation + celebration view
- Overall completion: 69% → 79%

### 2026-05-01 — Sprint 0 — Foundation scaffold and health baseline

### 2026-05-02 — Sprint 1 — Plan importer + topic map + DB seed

- Created `models/Plan.ts`, `models/Task.ts`, `models/Resource.ts` (Mongoose schemas)
- Created `lib/topic-map.ts` with 20+ keyword→resource mappings (MDN, OWASP, NeetCode, Anthropic docs, etc.)
- Created `lib/plan-importer.ts` — markdown parser + idempotent DB upsert
- Created `scripts/import-dev-plan.ts` — CLI entry point
- Import result: 1 Plan, 264 Tasks, 264 Resource docs; re-run = same counts, zero duplicates
- Resolved `new: true` → `returnDocument: 'after'` for Mongoose 9 compatibility
- Sprint 0 health check now verified connected (MONGODB_URI set); only Vercel deploy outstanding
- Next: Sprint 2 — Auth + `/today` page
- Overall completion: 8% → 22%
- Scaffolded `growthpath-app` with Bun + Next.js App Router + Tailwind 4
- Added locked color tokens in `app/globals.css`, `lib/db.ts`, and `GET /api/health` (connected-state pending MongoDB env)
- Added `.env.example` and `.env.local.example`, copied `SPEC.md` + `progress.md` to repo root, and updated `CLAUDE.md`
- Next: deploy preview to Vercel to close Sprint 0
- Overall completion: 0% → 8%

### 2026-05-01 — Pre-Sprint 0 — Spec and progress ledger created

- `SPEC.md` placed at workspace root with full product + technical spec
- `progress.md` created (this file) — empty ledger ready for Sprint 0
- Next: scaffold the Bun + Next.js repo (Sprint 0)
- Overall completion: 0% → 0% (no code yet, ledger live)
