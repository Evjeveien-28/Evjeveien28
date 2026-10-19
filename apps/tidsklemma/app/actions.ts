"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";

export async function loggInn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/logg-inn?feil=1");

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Nye brukere opprettes bare hvis e-posten er invitert (sjekkes av hook_bare_inviterte i Supabase).
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/bekreft` },
  });
  redirect(error ? "/logg-inn?feil=1" : "/logg-inn?sendt=1");
}

export async function loggUt() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/logg-inn");
}
