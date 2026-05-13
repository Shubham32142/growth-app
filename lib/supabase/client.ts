import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use from "use client" components for
 * sign-in/sign-up/sign-out actions. Reads + writes auth cookies that the
 * server client can pick up.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
