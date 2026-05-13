import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export const config = {
  matcher: [
    "/today",
    "/today/:path*",
    "/progress",
    "/progress/:path*",
    "/wins",
    "/wins/:path*",
    "/admin",
    "/admin/:path*",
    "/recap/:path*",
    "/plans",
    "/plans/:path*",
  ],
};

export default async function proxy(req: NextRequest) {
  return updateSession(req);
}
