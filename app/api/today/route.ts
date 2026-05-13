import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadTodayData, parseDateParam } from "@/lib/today";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("date") ?? undefined;
  const parsed = parseDateParam(raw);
  if (parsed === "invalid") {
    return NextResponse.json(
      { error: "`date` must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const data = await loadTodayData(session.user.id, parsed);
  return NextResponse.json(data);
}
