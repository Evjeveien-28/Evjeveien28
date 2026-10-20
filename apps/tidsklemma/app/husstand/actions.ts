"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { FARGER, hentPersoner, ledigFarge, rensNavn } from "./personer";

export async function inviter(formData: FormData) {
  const husstand = String(formData.get("husstand") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!husstand || !email) redirect("/husstand?feil=1");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inviter_til_husstand", { hid: husstand, epost: email });
  if (error) redirect("/husstand?feil=1");

  revalidatePath("/husstand");
  redirect(`/husstand?${data === "medlem" ? "lagt-til" : "invitert"}=${encodeURIComponent(email.toLowerCase())}`);
}

export async function trekkTilbake(formData: FormData) {
  const husstand = String(formData.get("husstand") ?? "");
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  await supabase.from("household_invitations").delete().eq("household_id", husstand).eq("email", email);

  revalidatePath("/husstand");
  redirect("/husstand");
}

/** Personer uten app, f.eks. barn. Fargen blir den første ledige. */
export async function leggTilPerson(formData: FormData) {
  const husstand = String(formData.get("husstand") ?? "");
  const navn = rensNavn(formData.get("navn"));
  if (!husstand || !navn) redirect("/husstand?feil=person");

  const supabase = await createClient();
  let farge: string;
  try {
    farge = ledigFarge(await hentPersoner(supabase, husstand));
  } catch {
    redirect("/husstand?feil=person");
  }
  const { error } = await supabase.from("household_people").insert({ household_id: husstand, navn, farge });
  if (error) redirect("/husstand?feil=person");

  revalidatePath("/husstand");
  redirect("/husstand");
}

export async function endrePerson(formData: FormData) {
  const id = String(formData.get("person") ?? "");
  const farge = String(formData.get("farge") ?? "");
  const navn = rensNavn(formData.get("navn"));
  if (!FARGER.some((f) => f.hex === farge)) redirect(`/husstand/person/${id}?feil=1`);

  const supabase = await createClient();
  const [{ data: person }, { data: meg }] = await Promise.all([
    supabase.from("household_people").select("user_id").eq("id", id).maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!person) redirect("/husstand");
  const erMeg = person.user_id !== null && person.user_id === meg?.claims.sub;
  // Navnet til de med app settes av dem selv, og følger fornavnet deres.
  const kanEndreNavn = person.user_id === null || erMeg;
  if (kanEndreNavn && !navn) redirect(`/husstand/person/${id}?feil=1`);

  const { error } = await supabase
    .from("household_people")
    .update(kanEndreNavn ? { navn, farge } : { farge })
    .eq("id", id);
  if (error) redirect(`/husstand/person/${id}?feil=1`);
  if (erMeg) {
    await supabase.auth.updateUser({ data: { fornavn: navn } });
    await supabase.auth.refreshSession();
  }

  revalidatePath("/", "layout");
  redirect("/husstand");
}

export async function slettPerson(formData: FormData) {
  const id = String(formData.get("person") ?? "");
  const supabase = await createClient();
  // Reglene i databasen tillater bare å slette personer uten app.
  await supabase.from("household_people").delete().eq("id", id).is("user_id", null);
  revalidatePath("/husstand");
  redirect("/husstand");
}
