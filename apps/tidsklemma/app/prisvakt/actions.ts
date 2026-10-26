"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { hentHusstand } from "../planter/data";
import { iDag } from "../dato";
import { lesBelop } from "./data";
import { butikkNavn, hentProdukt } from "./hent";

function gyldigLenke(tekst: string): string | null {
  try {
    const url = new URL(tekst.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Henter varen fra lenken og begynner å følge prisen. */
export async function leggTil(formData: FormData) {
  const rå = String(formData.get("url") ?? "");
  const url = gyldigLenke(rå);
  const onsket = lesBelop(formData.get("onsket"));
  const tilbake = (feil: string) => `/prisvakt/ny?feil=${feil}&url=${encodeURIComponent(rå)}`;
  if (!url) redirect(tilbake("lenke"));
  if (onsket === "feil") redirect(tilbake("belop"));

  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  if (!husstand) redirect("/");
  const db = supabase.schema("prisvakt");

  const { data: finnes } = await db.from("varer").select("id").eq("household_id", husstand.id).eq("url", url).maybeSingle();
  if (finnes) redirect(`/prisvakt/${finnes.id}`);

  const svar = await hentProdukt(url);
  if (!svar.ok) redirect(`${tilbake("henting")}&melding=${encodeURIComponent(svar.feil)}`);
  const p = svar.produkt;

  const { data, error } = await db
    .from("varer")
    .insert({
      household_id: husstand.id,
      url,
      butikk: butikkNavn(url),
      navn: p.navn.slice(0, 200),
      bilde_url: p.bilde,
      ean: p.ean,
      pris: p.pris,
      startpris: p.pris,
      pa_lager: p.paLager,
      onsket_pris: onsket,
    })
    .select("id")
    .single();
  if (error || !data) redirect(tilbake("lagre"));
  await db.from("priser").insert({ vare_id: data.id, dato: iDag(), pris: p.pris });

  revalidatePath("/", "layout");
  redirect(`/prisvakt/${data.id}?lagt=1`);
}

export async function settOnsket(formData: FormData) {
  const id = String(formData.get("vare") ?? "");
  const onsket = lesBelop(formData.get("onsket"));
  if (onsket === "feil") redirect(`/prisvakt/${id}?feil=belop`);
  const supabase = await createClient();
  await supabase.schema("prisvakt").from("varer").update({ onsket_pris: onsket }).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/prisvakt/${id}`);
}

/** Sjekker prisen nå, i stedet for å vente til i morgen tidlig. */
export async function sjekkNa(formData: FormData) {
  const id = String(formData.get("vare") ?? "");
  const supabase = await createClient();
  const db = supabase.schema("prisvakt");
  const { data } = await db.from("varer").select("url").eq("id", id).maybeSingle();
  if (!data) redirect("/prisvakt");
  const svar = await hentProdukt(data.url);
  const na = new Date().toISOString();
  if (!svar.ok) {
    await db.from("varer").update({ feil: svar.feil, sist_sjekket: na }).eq("id", id);
  } else {
    await db.from("varer").update({ pris: svar.produkt.pris, pa_lager: svar.produkt.paLager, feil: null, sist_sjekket: na }).eq("id", id);
    await db.from("priser").upsert({ vare_id: id, dato: iDag(), pris: svar.produkt.pris }, { onConflict: "vare_id,dato" });
  }
  revalidatePath("/", "layout");
  redirect(`/prisvakt/${id}`);
}

export async function slutt(formData: FormData) {
  const id = String(formData.get("vare") ?? "");
  const supabase = await createClient();
  await supabase.schema("prisvakt").from("varer").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/prisvakt");
}
