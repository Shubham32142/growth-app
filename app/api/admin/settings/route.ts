import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { parseBody, updateSettingsBody } from "@/lib/schemas";

const HARDCODED_DEFAULT = "meta-llama/llama-3.2-3b-instruct:free";
const SETTING_KEY = "openrouter.model";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbSetting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, SETTING_KEY))
    .limit(1);

  const source = dbSetting?.value
    ? "db"
    : process.env.OPENROUTER_MODEL?.trim()
      ? "env"
      : "default";

  const model =
    dbSetting?.value ??
    process.env.OPENROUTER_MODEL?.trim() ??
    HARDCODED_DEFAULT;

  return NextResponse.json({ model, source });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(req, updateSettingsBody);
  if (!parsed.ok) return parsed.response;
  const value = parsed.data.model.trim();

  if (!value) {
    await db.delete(settings).where(eq(settings.key, SETTING_KEY));
    return NextResponse.json({ ok: true, cleared: true });
  }

  await db
    .insert(settings)
    .values({ key: SETTING_KEY, value, updatedBy: session.user.id })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy: session.user.id, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true, model: value });
}
