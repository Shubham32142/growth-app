import { NextResponse } from "next/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rateLimitHits } from "@/lib/db/schema";

interface CheckResult {
  ok: boolean;
  /** Current count in the window (after this hit, if recorded). */
  hits: number;
  /** Max allowed in the window. */
  max: number;
  /** Time when this hit's bucket expires, ISO. */
  resetAt: string;
}

/**
 * Sliding-window rate limit backed by the `rate_limit_hits` Postgres table.
 * Pure free-tier — no external service.
 *
 * Approach: insert one row per hit, then count rows for the same key within
 * the window. Best-effort cleanup of expired rows on each call.
 *
 *   const r = await checkRateLimit({ key: `recap:${userId}`, max: 5, windowMs: 3600_000 });
 *   if (!r.ok) return rateLimitResponse(r);
 *
 * Trade-offs vs Redis: we pay a few ms of DB round-trip and accept tiny
 * race windows under burst. Acceptable at the scale of this app.
 */
export async function checkRateLimit({
  key,
  max,
  windowMs,
}: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<CheckResult> {
  const now = Date.now();
  const since = new Date(now - windowMs);

  // Insert this hit and clean expired rows for the same key. We do these
  // sequentially (cheap, indexed) rather than one CTE — Drizzle's typing
  // is friendlier this way.
  await db.insert(rateLimitHits).values({ key });

  // Opportunistic cleanup. Fire-and-forget — failure here doesn't break
  // the check.
  db.delete(rateLimitHits)
    .where(and(eq(rateLimitHits.key, key), lt(rateLimitHits.at, since)))
    .catch(() => {});

  const [{ hits }] = await db
    .select({ hits: sql<number>`count(*)::int` })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.at, since)));

  return {
    ok: hits <= max,
    hits,
    max,
    resetAt: new Date(now + windowMs).toISOString(),
  };
}

export function rateLimitResponse(result: CheckResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down.",
      retryAfter: result.resetAt,
      hits: result.hits,
      max: result.max,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000)),
        ),
        "X-RateLimit-Limit": String(result.max),
        "X-RateLimit-Remaining": String(Math.max(0, result.max - result.hits)),
      },
    },
  );
}

/**
 * Convenience presets keyed by user id. All windows are 1 hour to keep the
 * mental model simple.
 */
export const LIMITS = {
  /** Plan creation is the heaviest operation. */
  planCreate: { max: 5, windowMs: 60 * 60 * 1000 },
  /** Weekly task regen. */
  generateWeek: { max: 12, windowMs: 60 * 60 * 1000 },
  /** Recap generation. */
  recap: { max: 6, windowMs: 60 * 60 * 1000 },
  /** Resource Tier-2 search. */
  resources: { max: 30, windowMs: 60 * 60 * 1000 },
} as const;
