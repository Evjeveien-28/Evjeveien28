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
    // Bare brukere som er lagt inn i Supabase kan logge inn.
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/bekreft` },
  });
  redirect(error ? "/logg-inn?feil=1" : "/logg-inn?sendt=1");
}

export async function loggUt() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/logg-inn");
}
