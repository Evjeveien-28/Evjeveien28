import type { createClient } from "@hjem/db/server";
import type { Person } from "../husstand/personer";
import { dagerMellom, kl, leggTilDager } from "./tid";

type Klient = Awaited<ReturnType<typeof createClient>>;

export const AVTALEFELT =
  "id, household_id, tittel, start_dato, start_tid, slutt_dato, slutt_tid, sted, gjentakelse, gjentas_til, created_by, avlyst_at, deltakere(person_id), unntak(dato)";

export type AvtaleRad = {
  id: string;
  household_id: string;
  tittel: string;
  start_dato: string;
  start_tid: string | null;
  slutt_dato: string;
  slutt_tid: string | null;
  sted: string | null;
  gjentakelse: string;
  gjentas_til: string | null;
  created_by: string | null;
  avlyst_at: string | null;
  deltakere: { person_id: string }[];
  unntak?: { dato: string }[];
};

export type Gjentakelse = "ingen" | "daglig" | "ukentlig" | "annenhver" | "maanedlig";

export const GJENTAKELSER: { verdi: Gjentakelse; navn: string }[] = [
  { verdi: "ingen", navn: "Ikke" },
  { verdi: "daglig", navn: "Hver dag" },
  { verdi: "ukentlig", navn: "Hver uke" },
  { verdi: "annenhver", navn: "Annenhver uke" },
  { verdi: "maanedlig", navn: "Hver måned" },
];

/**
 * En avtale, eller én gang i en serie. For en gang i en serie er `start_dato` og `slutt_dato`
 * flyttet til den gangen, mens `serie_start` er datoen serien begynte.
 */
export type Avtale = Omit<AvtaleRad, "deltakere" | "unntak" | "gjentakelse"> & {
  gjentakelse: Gjentakelse;
  personer: string[];
  unntak: string[];
  serie_start: string;
};

export function tilAvtale(rad: AvtaleRad): Avtale {
  const { deltakere, unntak, ...resten } = rad;
  return {
    ...resten,
    gjentakelse: resten.gjentakelse as Gjentakelse,
    personer: deltakere.map((d) => d.person_id),
    unntak: (unntak ?? []).map((u) => u.dato),
    serie_start: resten.start_dato,
  };
}

function leggTilManeder(dato: string, n: number): string | null {
  const [a, m, d] = dato.split("-").map(Number);
  const ny = new Date(Date.UTC(a!, m! - 1 + n, d!));
  // Måneder uten denne datoen (f.eks. 31.) hoppes over.
  return ny.getUTCDate() === d ? ny.toISOString().slice(0, 10) : null;
}

/** Gangene i en serie som varer helt eller delvis fra og med `fra` til og med `til`. */
export function ganger(a: Avtale, fra: string, til: string): Avtale[] {
  const lengde = dagerMellom(a.serie_start, a.slutt_dato);
  const flytt = (start: string): Avtale => ({ ...a, start_dato: start, slutt_dato: leggTilDager(start, lengde) });
  if (a.gjentakelse === "ingen") return a.slutt_dato >= fra && a.start_dato <= til ? [a] : [];

  const slutt = a.gjentas_til && a.gjentas_til < til ? a.gjentas_til : til;
  const resultat: Avtale[] = [];
  const med = (start: string) => {
    if (start <= slutt && leggTilDager(start, lengde) >= fra && !a.unntak.includes(start)) resultat.push(flytt(start));
  };
  if (a.gjentakelse === "maanedlig") {
    for (let n = 0; ; n++) {
      const start = leggTilManeder(a.serie_start, n);
      if (start === null) continue;
      if (start > slutt) break;
      med(start);
    }
    return resultat;
  }
  const steg = a.gjentakelse === "daglig" ? 1 : a.gjentakelse === "ukentlig" ? 7 : 14;
  // Hopp rett frem til like før `fra`.
  const forste = Math.max(0, Math.floor((dagerMellom(a.serie_start, fra) - lengde) / steg));
  for (let n = forste; ; n++) {
    const start = leggTilDager(a.serie_start, n * steg);
    if (start > slutt) break;
    med(start);
  }
  return resultat;
}

/** Gangen i serien som starter på `dato`, eller avtalen selv. */
export function gangPa(a: Avtale, dato: string | undefined): Avtale {
  if (!dato || a.gjentakelse === "ingen") return a;
  return ganger(a, dato, dato).find((g) => g.start_dato === dato) ?? a;
}

/** Lenke til avtalen, eller til én bestemt gang i en serie. */
export function avtaleLenke(a: Avtale, del = ""): string {
  const base = `/familiekalender/${a.id}${del}`;
  return a.gjentakelse === "ingen" ? base : `${base}?dato=${a.start_dato}`;
}

export function gjentakelseTekst(a: Pick<Avtale, "gjentakelse" | "gjentas_til">, dagTekst: (d: string) => string): string | null {
  const navn = GJENTAKELSER.find((g) => g.verdi === a.gjentakelse && g.verdi !== "ingen")?.navn;
  if (!navn) return null;
  return a.gjentas_til ? `${navn} til og med ${dagTekst(a.gjentas_til)}` : navn;
}

/** Avtaler som ikke er avlyst og som varer helt eller delvis fra og med `fra` til og med `til`, med hver gang i seriene. */
export async function hentAvtaler(supabase: Klient, husstand: string, fra: string, til: string): Promise<Avtale[]> {
  const { data, error } = await supabase
    .schema("kalender")
    .from("avtaler")
    .select(AVTALEFELT)
    .eq("household_id", husstand)
    .is("avlyst_at", null)
    .lte("start_dato", til)
    .or(`slutt_dato.gte.${fra},and(gjentakelse.neq.ingen,or(gjentas_til.is.null,gjentas_til.gte.${fra}))`)
    .order("start_dato")
    .order("start_tid", { nullsFirst: true });
  if (error) throw new Error(error.message);
  return (data as AvtaleRad[]).map(tilAvtale).flatMap((a) => ganger(a, fra, til));
}

/** En avtale slik den ser ut på én bestemt dag. Avtaler over flere dager vises på hver dag. */
export type Forekomst = {
  avtale: Avtale;
  dato: string;
  /** 1 for første dag. */
  dagNr: number;
  antallDager: number;
  /** Klokkeslett denne dagen. Begge null betyr hele dagen. */
  fra: string | null;
  til: string | null;
};

export function forekomsterPaDag(avtaler: Avtale[], dato: string): Forekomst[] {
  return avtaler
    .filter((a) => a.start_dato <= dato && a.slutt_dato >= dato)
    .map((a) => {
      const antallDager = dagerMellom(a.start_dato, a.slutt_dato) + 1;
      const forste = dato === a.start_dato;
      const siste = dato === a.slutt_dato;
      return {
        avtale: a,
        dato,
        dagNr: dagerMellom(a.start_dato, dato) + 1,
        antallDager,
        fra: forste ? kl(a.start_tid) : null,
        til: siste ? kl(a.slutt_tid) : null,
      };
    })
    .sort((x, y) => (x.fra ?? (x.til ? "00:00" : "")).localeCompare(y.fra ?? (y.til ? "00:00" : "")));
}

const minutter = (tid: string) => Number(tid.slice(0, 2)) * 60 + Number(tid.slice(3, 5));

/** Er avtalen over for i dag? Uten sluttid regnes den som ferdig en time etter start. */
export function erOver(f: Forekomst, naa: string): boolean {
  if (f.til) return f.til <= naa;
  if (f.fra && f.dagNr === f.antallDager) return minutter(f.fra) + 60 <= minutter(naa);
  return false;
}

export function dager(fra: string, antall: number): string[] {
  return Array.from({ length: antall }, (_, i) => leggTilDager(fra, i));
}

/** «Alle» når alle i husstanden er med, ellers navnene. */
export function hvemTekst(personer: string[], alle: Person[]): string {
  if (alle.length > 1 && alle.every((p) => personer.includes(p.id))) return "Alle";
  return alle
    .filter((p) => personer.includes(p.id))
    .map((p) => p.navn)
    .join(", ");
}

export type Varsel = {
  id: string;
  type: "ny" | "endret" | "avlyst";
  endring: string | null;
  laget_av: string | null;
  created_at: string;
  avtale: Avtale;
};

/** Mine usette varsler, for avtaler som ikke er over. */
export async function hentVarsler(supabase: Klient, idag: string): Promise<Varsel[]> {
  const { data, error } = await supabase
    .schema("kalender")
    .from("varsler")
    .select(`id, type, endring, laget_av, created_at, avtale:avtaler!inner(${AVTALEFELT})`)
    .is("sett_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as (Omit<Varsel, "avtale"> & { avtale: AvtaleRad })[])
    .map((v) => ({ ...v, avtale: tilAvtale(v.avtale) }))
    .filter(({ avtale: a }) => a.slutt_dato >= idag || (a.gjentakelse !== "ingen" && (!a.gjentas_til || a.gjentas_til >= idag)));
}
