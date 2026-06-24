import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { resources, tasks, type SearchResource } from "@/lib/db/schema";
import { searchResources } from "@/lib/search";
import { rankResources } from "@/lib/ai";
import { getUserProviderConfig } from "@/lib/ai-config";
import { LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

const TTL_DAYS = 30;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isFresh(fetchedAtISO: string): boolean {
  const ms = TTL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(fetchedAtISO).getTime() < ms;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const rl = await checkRateLimit({
    key: `resources:${session.user.id}`,
    ...LIMITS.resources,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.taskId, id))
    .limit(1);

  const curated = resource?.curated ?? [];

  const firstSearch = resource?.search?.[0];
  if (firstSearch && isFresh(firstSearch.fetchedAt)) {
    return NextResponse.json({
      curated,
      search: resource?.search ?? [],
      community: resource?.community ?? [],
      cached: true,
    });
  }

  // Tier 2: Tavily → LLM ranking (uses the user's BYOK provider). If the user
  // hasn't configured a key, skip ranking gracefully — resources are an
  // enhancement, not core to the page.
  let search: SearchResource[] = [];
  try {
    const aiConfig = await getUserProviderConfig(session.user.id);
    const candidates = aiConfig ? await searchResources(task.title) : [];
    if (aiConfig && candidates.length > 0) {
      const ranked = await rankResources(aiConfig, task.title, candidates);
      search = ranked.map((r) => ({
        title: r.title,
        url: r.url,
        type: "article" as const,
        summary: r.reason,
        snippet: r.snippet,
        fetchedAt: new Date().toISOString(),
        modelUsed: aiConfig.model,
        searchProvider: "tavily" as const,
      }));

      if (resource) {
        await db
          .update(resources)
          .set({ search, updatedAt: new Date() })
          .where(eq(resources.id, resource.id));
      } else {
        await db.insert(resources).values({ taskId: id, search });
      }
    }
  } catch (err) {
    console.error("[resources] Tier 2 fetch failed:", err);
  }

  return NextResponse.json({
    curated,
    search,
    community: resource?.community ?? [],
    cached: false,
  });
}
