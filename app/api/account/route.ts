import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";

/**
 * DELETE /api/account — fully removes the user from Supabase Auth.
 *
 * Cascade FKs on every user-owned table wipe profiles, plans, plan_weeks,
 * tasks, completions, energy_logs, resources, wins, recaps. The auth.users
 * row is removed by Supabase Auth's admin API; everything else falls.
 *
 * After success the user is logged out client-side (the auth cookie is
 * invalidated server-side).
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (err) {
    log.error("account.delete.no_admin_client", err, { userId });
    return NextResponse.json(
      { error: "Account deletion is not configured on the server." },
      { status: 500 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    log.error("account.delete.failed", error, { userId });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.info("account.deleted", { userId });
  return NextResponse.json({ ok: true });
}
