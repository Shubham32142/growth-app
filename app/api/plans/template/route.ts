import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan";
import { instantiateTemplatePlanForUser } from "@/lib/plan-importer";

/**
 * POST — create a template plan for the current user from the curated
 * 6-month-developer-plan.md. Refuses if the user already has an active plan
 * (they need to reset first).
 *
 * Markdown is read at the project root (one dir above /growthpath-app, the
 * repo's `plan` workspace) and falls back to a path inside the app if not
 * found there.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const existing = await getActivePlan(userId);
  if (existing) {
    return NextResponse.json(
      { error: "You already have an active plan. Reset it from /admin first." },
      { status: 409 },
    );
  }

  let markdown: string;
  try {
    markdown = await loadPlanMarkdown();
  } catch (err) {
    console.error("[plans/template] could not load markdown:", err);
    return NextResponse.json(
      { error: "Template plan markdown could not be loaded on the server." },
      { status: 500 },
    );
  }

  try {
    const result = await instantiateTemplatePlanForUser(userId, markdown);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[plans/template] instantiation failed:", err);
    return NextResponse.json(
      { error: "Failed to create the plan." },
      { status: 500 },
    );
  }
}

async function loadPlanMarkdown(): Promise<string> {
  // `process.cwd()` is intentionally dynamic at runtime — the markdown lives
  // outside the bundled app. The turbopackIgnore comment tells the bundler
  // not to trace the whole filesystem from this call.
  const cwd = /* turbopackIgnore: true */ process.cwd();
  const candidates = [
    // Repo root (one level above the app dir)
    join(cwd, "..", "6-month-developer-plan.md"),
    // Bundled with the app
    join(cwd, "6-month-developer-plan.md"),
  ];
  for (const p of candidates) {
    try {
      return await readFile(p, "utf8");
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    "6-month-developer-plan.md not found in repo root or app directory",
  );
}
