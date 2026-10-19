import { createClient } from "@hjem/db/server";

/** Innlogget bruker med fornavn (fra user_metadata) og forbokstav til ikonet. */
export async function hentBruker() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const email = (claims.email as string | undefined) ?? "";
  const meta = (claims.user_metadata ?? {}) as { fornavn?: unknown };
  const fornavn = typeof meta.fornavn === "string" && meta.fornavn.trim() ? meta.fornavn.trim() : null;
  return { id: claims.sub, email, fornavn, forbokstav: (fornavn ?? email).charAt(0).toUpperCase() || "?" };
}
