import type { NextRequest } from "next/server";
import { updateSession } from "@hjem/db/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request, { loginPath: "/logg-inn", publicPaths: ["/auth/"] });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
