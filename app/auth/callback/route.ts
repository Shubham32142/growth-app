import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Receives the OAuth / email-confirmation redirect from Supabase, exchanges
 * the auth code for a session cookie, then forwards the user to `next`
 * (default `/today`).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=oauth_failed", url.origin));
}
