# GrowthPath

A calm personal-growth companion. Pick a duration (3 / 6 / 9 months or
custom), answer 5 questions, and an AI builds a week-by-week plan that
adapts to how you actually do. Daily tasks, forgiving streaks, weekly
recaps, all in a quiet dark UI.

Fully **free-tier**: Supabase Postgres (DB + Auth + RLS) + Vercel (hosting
+ cron) + OpenRouter (free models) + Tavily (free search). No paid
services required to run this.

## Stack

- **Frontend**: Next.js 16 (App Router, RSC), React 19, TypeScript, Tailwind v4, framer-motion, shadcn-style primitives
- **Backend**: Supabase Postgres via Drizzle ORM, Row-Level Security on every user-owned table
- **Auth**: Supabase Auth (email + Google OAuth, cookie-based)
- **AI**: OpenRouter free-tier models for plan outline / weekly tasks / recaps
- **Search**: Tavily (Brave fallback) for grounded resource URLs
- **Cron**: Vercel Cron for Sunday-night weekly task regeneration
- **Validation**: Zod at every API boundary
- **Rate limiting**: Postgres-backed sliding window (no Redis/Upstash needed)

## Local setup

```powershell
bun install
```

Create `.env.local` from `.env.local.example` and fill in:

- `DATABASE_URL` — Supabase **transaction pooler** (port 6543), URL-encoded password
- `DIRECT_URL` — Supabase **direct connection** (port 5432), for migrations
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — admin scripts + account deletion only
- `OPENROUTER_API_KEY` — https://openrouter.ai (free tier)
- `TAVILY_API_KEY` — https://tavily.com (free tier, optional)
- `CRON_SECRET` — any long random string for cron auth (`openssl rand -hex 32`)

Apply database migrations:

```powershell
bun run db:apply
```

This creates the schema (plans, plan_weeks, tasks, completions, energy_logs,
resources, wins, recaps, profiles, settings, rate_limit_hits) and enables
RLS + the `handle_new_user` profile-creation trigger.

Run the dev server:

```powershell
bun dev
```

Open http://localhost:3000.

## What you'll see

1. `/sign-up` — Supabase Auth creates the user; trigger auto-creates a `profiles` row
2. `/today` — empty, redirects to `/plans/new`
3. `/plans/new` — pick 3/6/9/custom or use the curated 6-month dev plan template
4. `/plans/new/wizard` — 5 questions (topic, goal, level, hours/day, style)
5. `/plans/new/generating` — animated 2-step loading (outline → week 1 tasks)
6. `/today` — your AI-tailored tasks for week 1
7. `/progress` — streak, week %, overall %, activity heatmap, weekly energy
8. `/wins` — Friday 3-wins journal
9. `/recap/[week]` — Sunday AI-generated recap with shareable link
10. `/admin` — model picker, plan reset, data export, account deletion

## Deploy to Vercel

1. Push to GitHub
2. Import the repo on https://vercel.com
3. Set the env vars above in **Settings → Environment Variables**
4. Cron is auto-configured by `vercel.json` (Sundays 20:00 UTC)
5. Vercel deploys on every push to `main`

## Key conventions

- **Path params for identity**, query params for filters (`/api/tasks/[id]/complete` vs `/api/today?date=…`)
- **Server components fetch directly**; client components fetch via `/api/*`
- **`auth()` and `getActivePlan()` are `cache()`-wrapped** so a single request dedupes lookups
- **RLS is the second line of defence** — every route also checks ownership in app code
- **Never bypass RLS** unless inside a clearly-marked admin script (`lib/supabase/admin.ts`) or the cron route
- **LLMs filter, never invent** — Tavily returns real URLs; the model only picks indices

## Documentation

- [`SPEC.md`](SPEC.md) — product + architecture spec (with the 2026-05-13 AI-plan pivot)
- [`CLAUDE.md`](CLAUDE.md) — agent conventions for future Claude Code sessions
- [`progress.md`](progress.md) — living ledger of what's shipped

## Scripts

```powershell
bun dev               # local dev server
bun run lint          # eslint
bun run build         # production build
bun run db:apply      # apply all SQL migrations in supabase/migrations
bun run db:generate   # regenerate migration from Drizzle schema
bun run db:studio     # open Drizzle Studio
```
