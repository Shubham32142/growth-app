import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Drop-in replacement for the previous NextAuth `auth()` export.
 *
 * Keeps the same return shape — `{ user: { id, email, name, image } }` or
 * `null` — so existing server components and API routes can keep using
 * `const session = await auth(); session?.user?.id` without changes.
 *
 * Backed by Supabase Auth: the user's session lives in cookies set by
 * Supabase's auth flow and refreshed by `proxy.ts`.
 *
 * Wrapped in React `cache()` so multiple calls within a single server
 * render (layout + page + lib helpers) hit Supabase Auth only once.
 */
export const auth = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
  };

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name: meta.name ?? meta.full_name ?? null,
      image: meta.avatar_url ?? meta.picture ?? null,
    },
  };
});
