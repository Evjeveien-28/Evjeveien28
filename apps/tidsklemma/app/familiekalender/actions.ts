"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { hentPersoner } from "../husstand/personer";
import { AVTALEFELT, GJENTAKELSER, avtaleLenke, gangPa, gjentakelseTekst, tilAvtale, type Avtale, type AvtaleRad, type Gjentakelse } from "./data";
import { varsle } from "./push";
import { dagTekst, dagerMellom, erGyldigDato, kl, leggTilDager } from "./tid";

type Klient = Awaited<ReturnType<typeof createClient>>;

const erTid = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

function tidTekst(a: Pick<Avtale, "start_tid" | "slutt_tid">) {
  if (!a.start_tid) return "hele dagen";
  return a.slutt_tid ? `${kl(a.start_tid)}–${kl(a.slutt_tid)}` : kl(a.start_tid)!;
}

function nar(a: Pick<Avtale, "start_dato" | "slutt_dato" | "start_tid" | "slutt_tid">) {
  const dato = a.slutt_dato > a.start_dato ? `${dagTekst(a.start_dato)}–${dagTekst(a.slutt_dato)}` : dagTekst(a.start_dato);
  return a.start_tid ? `${dato} kl. ${tidTekst(a)}` : dato;
}

/** Hva som er endret av det som betyr noe for de andre: dag, klokkeslett, gjentakelse og hvem. Ikke tittel og sted. */
function beskrivEndring(gammel: Avtale, ny: Avtale, navn: Map<string, string>): string | null {
  const deler: string[] = [];
  const nyDag = gammel.start_dato !== ny.start_dato || gammel.slutt_dato !== ny.slutt_dato;
  const nyTid = gammel.start_tid !== ny.start_tid || gammel.slutt_tid !== ny.slutt_tid;
  if (nyDag) deler.push(`${nar(gammel)} → ${nar(ny)}`);
  else if (nyTid) deler.push(`${dagTekst(ny.start_dato)}: ${tidTekst(gammel)} → ${tidTekst(ny)}`);
  if (gammel.gjentakelse !== ny.gjentakelse || gammel.gjentas_til !== ny.gjentas_til)
    deler.push(gjentakelseTekst(ny, dagTekst) ?? "Gjentas ikke lenger");
  const med = ny.personer.filter((p) => !gammel.personer.includes(p)).map((p) => `+ ${navn.get(p) ?? "?"}`);
  const ut = gammel.personer.filter((p) => !ny.personer.includes(p)).map((p) => `− ${navn.get(p) ?? "?"}`);
  deler.push(...med, ...ut);
  return deler.length ? deler.join(" · ") : null;
}

async function nyAvtale(supabase: Klient, husstand: string, verdier: Record<string, unknown>, personer: string[]) {
  const db = supabase.schema("kalender");
  const { data, error } = await db.from("avtaler").insert({ household_id: husstand, ...verdier }).select("id").single();
  if (error || !data) return null;
  const { error: feil } = await db.from("deltakere").insert(personer.map((p) => ({ avtale_id: data.id, person_id: p })));
  if (feil) {
    // Uten deltakere skal ikke avtalen bli liggende.
    await db.from("avtaler").update({ avlyst_at: new Date().toISOString() }).eq("id", data.id);
    return null;
  }
  return data.id as string;
}

async function oppdaterDeltakere(supabase: Klient, id: string, for_: string[], etter: string[]) {
  const db = supabase.schema("kalender");
  const inn = etter.filter((p) => !for_.includes(p));
  const ut = for_.filter((p) => !etter.includes(p));
  if (inn.length) {
    const { error } = await db.from("deltakere").insert(inn.map((p) => ({ avtale_id: id, person_id: p })));
    if (error) return false;
  }
  if (ut.length) await db.from("deltakere").delete().eq("avtale_id", id).in("person_id", ut);
  return true;
}

/**
 * Ny avtale, eller endring av en som finnes. For en serie gjelder endringen bare denne gangen,
 * denne og senere, eller alle gangene. De andre i husstanden får varsel.
 */
export async function lagre(formData: FormData) {
  const id = String(formData.get("avtale") ?? "");
  const husstand = String(formData.get("husstand") ?? "");
  const gang = String(formData.get("gang") ?? "");
  const omfang = String(formData.get("omfang") ?? "alle");
  const tilbake = id ? `/familiekalender/${id}/endre${gang ? `?dato=${gang}&` : "?"}` : "/familiekalender/ny?";
  const tittel = String(formData.get("tittel") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const sted = String(formData.get("sted") ?? "").trim().slice(0, 80) || null;
  const personer = [...new Set(formData.getAll("person").map(String))];
  const startDato = String(formData.get("dato") ?? "");
  const flereDager = formData.get("flere_dager") === "1";
  const sluttDato = flereDager ? String(formData.get("slutt_dato") ?? "") : startDato;
  const heleDagen = formData.get("hele_dagen") === "1";
  const fra = heleDagen ? "" : String(formData.get("fra") ?? "");
  const til = heleDagen || !fra ? "" : String(formData.get("til") ?? "");
  const gjentakelse = (GJENTAKELSER.find((g) => g.verdi === formData.get("gjentakelse"))?.verdi ?? "ingen") as Gjentakelse;
  const gjentasTil = gjentakelse === "ingen" ? null : String(formData.get("gjentas_til") ?? "") || null;

  if (!tittel) redirect(`${tilbake}feil=tittel`);
  if (personer.length === 0) redirect(`${tilbake}feil=hvem`);
  if (!erGyldigDato(startDato) || !erGyldigDato(sluttDato) || sluttDato < startDato) redirect(`${tilbake}feil=dato`);
  if ((fra && !erTid(fra)) || (til && !erTid(til)) || (til && sluttDato === startDato && til < fra)) redirect(`${tilbake}feil=tid`);
  if (gjentasTil && (!erGyldigDato(gjentasTil) || gjentasTil < startDato)) redirect(`${tilbake}feil=gjentas`);

  const verdier = {
    tittel,
    sted,
    start_dato: startDato,
    slutt_dato: sluttDato,
    start_tid: fra ? `${fra}:00` : null,
    slutt_tid: til ? `${til}:00` : null,
    gjentakelse,
    gjentas_til: gjentasTil,
  };

  const supabase = await createClient();
  const db = supabase.schema("kalender");

  if (!id) {
    const nyId = await nyAvtale(supabase, husstand, verdier, personer);
    if (!nyId) redirect(`${tilbake}feil=lagre`);
    const ny = { ...verdier, slutt_dato: sluttDato };
    const gjentas = gjentakelseTekst(ny, dagTekst);
    await varsle(supabase, nyId, "ny", null, { tittel, nar: gjentas ? `${gjentas.toLowerCase()} fra ${nar(ny)}` : nar(ny), url: `/familiekalender/${nyId}` });
    revalidatePath("/", "layout");
    redirect("/familiekalender");
  }

  const { data: rad } = await db.from("avtaler").select(AVTALEFELT).eq("id", id).maybeSingle();
  if (!rad) redirect("/familiekalender");
  const serie = tilAvtale(rad as AvtaleRad);
  // Gangen som ble endret, slik den så ut før.
  const gammel = gangPa(serie, gang || undefined);
  const navn = new Map((await hentPersoner(supabase, serie.household_id)).map((p) => [p.id, p.navn]));

  // Bare denne gangen: gangen tas ut av serien og blir en egen avtale.
  if (serie.gjentakelse !== "ingen" && omfang === "denne") {
    const egen = { ...verdier, gjentakelse: "ingen" as const, gjentas_til: null };
    const nyId = await nyAvtale(supabase, serie.household_id, egen, personer);
    if (!nyId) redirect(`${tilbake}feil=lagre`);
    await db.from("unntak").insert({ avtale_id: serie.id, dato: gammel.start_dato });
    const endring = beskrivEndring({ ...gammel, gjentakelse: "ingen", gjentas_til: null }, { ...gammel, ...egen, personer }, navn);
    if (endring)
      await varsle(supabase, nyId, "endret", `${endring} (bare denne gangen)`, { tittel, nar: `${endring} (bare denne gangen)`, url: `/familiekalender/${nyId}` });
    revalidatePath("/", "layout");
    redirect(`/familiekalender/${nyId}`);
  }

  // Denne og senere: serien slutter dagen før, og en ny serie starter fra denne gangen.
  if (serie.gjentakelse !== "ingen" && omfang === "fremover" && gammel.start_dato > serie.serie_start) {
    const nyId = await nyAvtale(supabase, serie.household_id, verdier, personer);
    if (!nyId) redirect(`${tilbake}feil=lagre`);
    await db.from("avtaler").update({ gjentas_til: leggTilDager(gammel.start_dato, -1), updated_at: new Date().toISOString() }).eq("id", serie.id);
    const endring = beskrivEndring(gammel, { ...gammel, ...verdier, personer }, navn);
    const fraOgMed = `${endring} (fra og med ${dagTekst(gammel.start_dato)})`;
    if (endring) await varsle(supabase, nyId, "endret", fraOgMed, { tittel, nar: fraOgMed, url: `/familiekalender/${nyId}` });
    revalidatePath("/", "layout");
    redirect(`/familiekalender/${nyId}${gjentakelse === "ingen" ? "" : `?dato=${startDato}`}`);
  }

  // Alle gangene (eller en enkeltavtale): flytt hele serien like mye som denne gangen ble flyttet.
  const flytt = dagerMellom(gammel.start_dato, startDato);
  const nyStart = leggTilDager(serie.serie_start, flytt);
  const alle = {
    ...verdier,
    start_dato: nyStart,
    slutt_dato: leggTilDager(nyStart, dagerMellom(startDato, sluttDato)),
    gjentas_til: gjentasTil && gjentasTil < nyStart ? nyStart : gjentasTil,
  };
  const { error } = await db
    .from("avtaler")
    .update({ ...alle, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`${tilbake}feil=lagre`);
  if (!(await oppdaterDeltakere(supabase, id, serie.personer, personer))) redirect(`${tilbake}feil=lagre`);

  const endring = beskrivEndring(gammel, { ...gammel, ...verdier, personer }, navn);
  if (endring) await varsle(supabase, id, "endret", endring, { tittel, nar: endring, url: `/familiekalender/${id}` });

  revalidatePath("/", "layout");
  redirect(avtaleLenke({ ...serie, ...alle, start_dato: startDato }));
}

/** Avlyste avtaler forsvinner fra kalenderen, og de andre får beskjed. For en serie velger man hvor mye. */
export async function avlys(formData: FormData) {
  const id = String(formData.get("avtale") ?? "");
  const gang = String(formData.get("dato") ?? "");
  const omfang = String(formData.get("omfang") ?? "alle");
  const supabase = await createClient();
  const db = supabase.schema("kalender");
  const { data } = await db.from("avtaler").select(AVTALEFELT).eq("id", id).maybeSingle();
  if (!data) redirect("/familiekalender");
  const serie = tilAvtale(data as AvtaleRad);
  const denne = gangPa(serie, gang || undefined);
  const feil = `${avtaleLenke(denne)}${denne.gjentakelse === "ingen" ? "?" : "&"}feil=avlys`;

  if (serie.gjentakelse !== "ingen" && omfang === "denne") {
    const { error } = await db.from("unntak").insert({ avtale_id: id, dato: denne.start_dato });
    if (error) redirect(feil);
    const tekst = `${nar(denne)} (bare denne gangen)`;
    await varsle(supabase, id, "avlyst", tekst, { tittel: serie.tittel, nar: tekst, url: "/familiekalender" });
  } else if (serie.gjentakelse !== "ingen" && omfang === "fremover" && denne.start_dato > serie.serie_start) {
    const { error } = await db
      .from("avtaler")
      .update({ gjentas_til: leggTilDager(denne.start_dato, -1), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) redirect(feil);
    const tekst = `fra og med ${dagTekst(denne.start_dato)}`;
    await varsle(supabase, id, "avlyst", `Fra og med ${dagTekst(denne.start_dato)}`, { tittel: serie.tittel, nar: tekst, url: "/familiekalender" });
  } else {
    const { error } = await db.from("avtaler").update({ avlyst_at: new Date().toISOString() }).eq("id", id);
    if (error) redirect(feil);
    const tekst = serie.gjentakelse === "ingen" ? nar(denne) : `Alle gangene (${gjentakelseTekst(serie, dagTekst)?.toLowerCase()})`;
    await varsle(supabase, id, "avlyst", tekst, { tittel: serie.tittel, nar: tekst.charAt(0).toLowerCase() + tekst.slice(1), url: "/familiekalender" });
  }

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
