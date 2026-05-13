import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Used inside `proxy.ts` (Next.js 16 successor to middleware.ts). Keeps the
 * Supabase Auth cookies fresh on every request and redirects unauthenticated
 * users on protected routes.
 */
export async function updateSession(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between `createServerClient` and
  // `getUser()` — it must come immediately after, per Supabase docs, so the
  // cookie is up-to-date before subsequent logic decides what to do.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isProtected =
    path === "/today" ||
    path.startsWith("/today/") ||
    path === "/progress" ||
    path.startsWith("/progress/") ||
    path === "/wins" ||
    path.startsWith("/wins/") ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/recap" ||
    path.startsWith("/recap/") ||
    path === "/plans" ||
    path.startsWith("/plans/");

  if (isProtected && !user) {
    const signIn = new URL("/sign-in", req.url);
    return NextResponse.redirect(signIn);
  }

  return response;
}
