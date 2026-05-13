import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in admin scripts /
 * trusted server routes (e.g. account deletion). Never expose to the
 * browser and never accept untrusted user input directly into queries.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
