import type { NextRequest } from "next/server";
import { updateSession } from "@hjem/db/proxy";

export function proxy(request: NextRequest) {
  // Rutene under /api/ kalles av jobber i Supabase, og sjekker hemmeligheten selv.
  return updateSession(request, { loginPath: "/logg-inn", publicPaths: ["/auth/", "/api/"] });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
