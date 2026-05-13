import type { ReactNode } from "react";

/**
 * Reserved for app-wide providers (theme, toast, analytics, etc.).
 * No SessionProvider needed — Supabase Auth uses cookies and the
 * server-side session resolution in `lib/auth.ts`.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
