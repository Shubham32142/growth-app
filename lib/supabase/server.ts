import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client. Use from server components, route handlers,
 * and server actions. Reads + refreshes the auth cookie automatically.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` can throw when called from a Server Component — that's
            // expected (cookies can only be written from Route Handlers /
            // Server Actions / Middleware). The session refresh in the proxy
            // covers this case, so we swallow the error.
          }
        },
      },
    },
  );
}
