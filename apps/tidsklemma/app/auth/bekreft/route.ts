import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@hjem/db/server";

/** Hit kommer brukeren fra innloggingslenken i e-posten. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/logg-inn?feil=1", request.url));
}
