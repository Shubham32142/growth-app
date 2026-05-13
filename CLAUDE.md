# GrowthPath Agent Conventions

Read `SPEC.md` end-to-end before touching code. If any user request conflicts
with the spec, flag it before implementing. The data-layer choices in SPEC.md
(MongoDB / NextAuth) have been superseded — see "Active stack" below; SPEC is
kept as historical context but does not override this file for stack questions.

## Active stack (post-migration)

- Bun runtime/package manager (`bun install`, `bun dev`, `bun run`)
- Next.js 16 App Router + TypeScript + React 19
- Tailwind CSS v4 with the SPEC.md color tokens
- **Supabase Postgres** (Auth + DB) via Drizzle ORM
- **Supabase Auth** (cookie-based, replaces NextAuth) — server client in
  `lib/supabase/server.ts`, browser client in `lib/supabase/client.ts`,
  middleware refresh in `lib/supabase/middleware.ts`
- Drizzle schema in `lib/db/schema.ts`, lazy client in `lib/db/client.ts`
- Migrations: `supabase/migrations/*.sql`. Apply with `bun run db:apply`.
  Generate diffs with `bun run db:generate`.
- Row-Level Security on every user-owned table — `auth.uid() = user_id`.
  Never bypass RLS from app code; use the service-role key only in admin
  scripts (the plan importer) and the cron route.
- `lib/auth.ts` is a thin shim that wraps the Supabase server session in the
  shape `{ user: { id, email, name, image } }` so existing call sites keep
  working with `const session = await auth()`.
- OpenRouter for LLM calls, Tavily for grounded search (Brave fallback)
- **AI plan generation** — `lib/ai.ts` exports `generatePlanOutline` (one
  LLM call per plan) and `generateWeekTasks` (one per week, with
  completion-based adjustment context). Plan creation is gated by the
  wizard at `/plans/new/wizard`. Weekly regen runs via Vercel Cron
  (`vercel.json` → `/api/cron/weekly-regen` on Sundays 20:00 UTC) with a
  lazy "Generate week N now" CTA in `/today` as fallback.

## Conventions

- All user-owned writes go through Drizzle, never via Supabase JS, so we get
  typed queries.
- Auth checks at the API boundary: `const session = await auth(); if (!session) return 401`.
  RLS is the second layer — both must pass.
- Path params for identity (`/api/tasks/[id]`), query params for filters
  (`/api/today?date=...`).
- Animations: use `components/motion-fade-up.tsx` for one-shot fade-in,
  framer-motion `layoutId` for sliding pills.

## Progress rule

After every change-set, update `progress.md`:

- Flip item status (⬜/🟡/✅/⚠️)
- Add a dated entry under "Recent updates"
- Update overall completion and current sprint status truthfully

## Local commands

- Install deps: `bun install`
- Run dev server: `bun dev`
- Lint: `bun run lint`
- Apply DB migrations: `bun run db:apply` (uses DIRECT_URL)
- Generate a new migration: `bun run db:generate`
- Open Drizzle Studio: `bun run db:studio`
- Import the 6-month plan into Postgres: `bun run import-plan ../6-month-developer-plan.md`

## Environment

`.env.local` requires:

- `DATABASE_URL` — Supabase **transaction pooler** (port 6543), `prepare: false`
- `DIRECT_URL` — Supabase **direct connection** (port 5432) for migrations
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — admin scripts only, never exposed to browser
- `OPENROUTER_API_KEY`, `TAVILY_API_KEY` (and optionally `BRAVE_SEARCH_API_KEY`)

Any password with special chars (`@ : / # ? & % +`) must be URL-encoded in
the connection strings.

## Current priority

Follow phase order from `progress.md`. We are mid-Sprint 7 polish; the
ordered phases are A (cleanup, done) → B (caching) → C (Zod) → D (rate limit
+ headers) → E (Sentry) → F (account delete + export) → G (ship).
