import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    // Simple round-trip to confirm Postgres is reachable.
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: "connected" });
  } catch {
    return NextResponse.json(
      { ok: false, db: "disconnected" },
      { status: 503 },
    );
  }
}
