"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { hentPersoner } from "../husstand/personer";
import { AVTALEFELT, tilAvtale, type Avtale, type AvtaleRad } from "./data";
import { dagTekst, erGyldigDato, kl } from "./tid";

const erTid = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

function tidTekst(a: Pick<Avtale, "start_tid" | "slutt_tid">) {
  if (!a.start_tid) return "hele dagen";
  return a.slutt_tid ? `${kl(a.start_tid)}–${kl(a.slutt_tid)}` : kl(a.start_tid)!;
}

function nar(a: Pick<Avtale, "start_dato" | "slutt_dato" | "start_tid" | "slutt_tid">) {
  const dato = a.slutt_dato > a.start_dato ? `${dagTekst(a.start_dato)}–${dagTekst(a.slutt_dato)}` : dagTekst(a.start_dato);
  return a.start_tid ? `${dato} kl. ${tidTekst(a)}` : dato;
}

/** Hva som er endret av det som betyr noe for de andre: dag, klokkeslett og hvem. Ikke tittel og sted. */
function beskrivEndring(gammel: Avtale, ny: Avtale, navn: Map<string, string>): string | null {
  const deler: string[] = [];
  const nyDag = gammel.start_dato !== ny.start_dato || gammel.slutt_dato !== ny.slutt_dato;
  const nyTid = gammel.start_tid !== ny.start_tid || gammel.slutt_tid !== ny.slutt_tid;
  if (nyDag) deler.push(`${nar(gammel)} → ${nar(ny)}`);
  else if (nyTid) deler.push(`${dagTekst(ny.start_dato)}: ${tidTekst(gammel)} → ${tidTekst(ny)}`);
  const med = ny.personer.filter((p) => !gammel.personer.includes(p)).map((p) => `+ ${navn.get(p) ?? "?"}`);
  const ut = gammel.personer.filter((p) => !ny.personer.includes(p)).map((p) => `− ${navn.get(p) ?? "?"}`);
  deler.push(...med, ...ut);
  return deler.length ? deler.join(" · ") : null;
}

/** Ny avtale, eller endring av en som finnes. De andre i husstanden får varsel. */
export async function lagre(formData: FormData) {
  const id = String(formData.get("avtale") ?? "");
  const husstand = String(formData.get("husstand") ?? "");
  const tilbake = id ? `/familiekalender/${id}/endre` : "/familiekalender/ny";
  const tittel = String(formData.get("tittel") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const sted = String(formData.get("sted") ?? "").trim().slice(0, 80) || null;
  const personer = [...new Set(formData.getAll("person").map(String))];
  const startDato = String(formData.get("dato") ?? "");
  const flereDager = formData.get("flere_dager") === "1";
  const sluttDato = flereDager ? String(formData.get("slutt_dato") ?? "") : startDato;
  const heleDagen = formData.get("hele_dagen") === "1";
  const fra = heleDagen ? "" : String(formData.get("fra") ?? "");
  const til = heleDagen || !fra ? "" : String(formData.get("til") ?? "");

  if (!tittel) redirect(`${tilbake}?feil=tittel`);
  if (personer.length === 0) redirect(`${tilbake}?feil=hvem`);
  if (!erGyldigDato(startDato) || !erGyldigDato(sluttDato) || sluttDato < startDato) redirect(`${tilbake}?feil=dato`);
  if ((fra && !erTid(fra)) || (til && !erTid(til)) || (til && sluttDato === startDato && til < fra)) redirect(`${tilbake}?feil=tid`);

  const verdier = {
    tittel,
    sted,
    start_dato: startDato,
    slutt_dato: sluttDato,
    start_tid: fra ? `${fra}:00` : null,
    slutt_tid: til ? `${til}:00` : null,
  };

  const supabase = await createClient();
  const db = supabase.schema("kalender");

  if (!id) {
    const { data, error } = await db.from("avtaler").insert({ household_id: husstand, ...verdier }).select("id").single();
    if (error || !data) redirect(`${tilbake}?feil=lagre`);
    const { error: feil } = await db.from("deltakere").insert(personer.map((p) => ({ avtale_id: data.id, person_id: p })));
    if (feil) {
      // Uten deltakere skal ikke avtalen bli liggende.
      await db.from("avtaler").update({ avlyst_at: new Date().toISOString() }).eq("id", data.id);
      redirect(`${tilbake}?feil=lagre`);
    }
    await supabase.schema("kalender").rpc("varsle", { aid: data.id, hva: "ny" });
    revalidatePath("/", "layout");
    redirect("/familiekalender");
  }

  const { data: rad } = await db.from("avtaler").select(AVTALEFELT).eq("id", id).maybeSingle();
  if (!rad) redirect("/familiekalender");
  const gammel = tilAvtale(rad as AvtaleRad);

  const { error } = await db
    .from("avtaler")
    .update({ ...verdier, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`${tilbake}?feil=lagre`);

  const ut = gammel.personer.filter((p) => !personer.includes(p));
  const inn = personer.filter((p) => !gammel.personer.includes(p));
  if (inn.length) {
    const { error: feil } = await db.from("deltakere").insert(inn.map((p) => ({ avtale_id: id, person_id: p })));
    if (feil) redirect(`${tilbake}?feil=lagre`);
  }
  if (ut.length) await db.from("deltakere").delete().eq("avtale_id", id).in("person_id", ut);

  const navn = new Map((await hentPersoner(supabase, gammel.household_id)).map((p) => [p.id, p.navn]));
  const endring = beskrivEndring(gammel, { ...gammel, ...verdier, personer }, navn);
  if (endring) await supabase.schema("kalender").rpc("varsle", { aid: id, hva: "endret", beskrivelse: endring });

  revalidatePath("/", "layout");
  redirect(`/familiekalender/${id}`);
}

/** Avlyste avtaler forsvinner fra kalenderen, og de andre får beskjed. */
export async function avlys(formData: FormData) {
  const id = String(formData.get("avtale") ?? "");
  const supabase = await createClient();
  const db = supabase.schema("kalender");
  const { data } = await db.from("avtaler").select(AVTALEFELT).eq("id", id).maybeSingle();
  if (!data) redirect("/familiekalender");

  const { error } = await db.from("avtaler").update({ avlyst_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/familiekalender/${id}?feil=avlys`);
  await db.rpc("varsle", { aid: id, hva: "avlyst", beskrivelse: nar(tilAvtale(data as AvtaleRad)) });

  revalidatePath("/", "layout");
  redirect("/familiekalender");
}

export async function sett(formData: FormData) {
  const varsler = formData.getAll("varsel").map(String).filter(Boolean);
  if (varsler.length) {
    const supabase = await createClient();
    await supabase.schema("kalender").from("varsler").update({ sett_at: new Date().toISOString() }).in("id", varsler);
  }
  revalidatePath("/", "layout");
  redirect("/familiekalender");
}
