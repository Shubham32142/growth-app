import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userAiSettings } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { testProviderKey } from "@/lib/ai-providers";
import { parseBody, saveAiSettingsBody, testAiSettingsBody } from "@/lib/schemas";
import { log } from "@/lib/log";

/**
 * BYOK provider settings for the current user.
 *
 *   GET    → { configured, provider, model }   (never returns the key)
 *   PATCH  → save provider + model (+ key); key optional if one already exists
 *   DELETE → remove the config
 *   POST ?action=test → validate a provider+key+model without saving
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      provider: userAiSettings.provider,
      model: userAiSettings.model,
    })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, session.user.id))
    .limit(1);

  return NextResponse.json({
    configured: !!row,
    provider: row?.provider ?? null,
    model: row?.model ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = await parseBody(req, saveAiSettingsBody);
  if (!parsed.ok) return parsed.response;
  const { provider, model, apiKey } = parsed.data;

  const [existing] = await db
    .select({ userId: userAiSettings.userId })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);

  if (!apiKey && !existing) {
    return NextResponse.json(
      { error: "An API key is required the first time you set up a provider." },
      { status: 400 },
    );
  }

  try {
    if (apiKey) {
      const apiKeyEncrypted = encryptSecret(apiKey);
      await db
        .insert(userAiSettings)
        .values({ userId, provider, model, apiKeyEncrypted })
        .onConflictDoUpdate({
          target: userAiSettings.userId,
          set: { provider, model, apiKeyEncrypted, updatedAt: new Date() },
        });
    } else {
      // Key unchanged — update provider/model only.
      await db
        .update(userAiSettings)
        .set({ provider, model, updatedAt: new Date() })
        .where(eq(userAiSettings.userId, userId));
    }
  } catch (err) {
    log.error("ai-settings.save.failed", err, { userId });
    return NextResponse.json(
      { error: "Could not save AI settings. Is APP_ENCRYPTION_KEY set?" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, provider, model });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db
    .delete(userAiSettings)
    .where(eq(userAiSettings.userId, session.user.id));
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get("action") !== "test") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const parsed = await parseBody(req, testAiSettingsBody);
  if (!parsed.ok) return parsed.response;
  const { provider, model, apiKey } = parsed.data;

  const result = await testProviderKey({ provider, apiKey, model });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
