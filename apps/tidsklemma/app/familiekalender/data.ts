import type { createClient } from "@hjem/db/server";
import type { Person } from "../husstand/personer";
import { dagerMellom, kl, leggTilDager } from "./tid";

type Klient = Awaited<ReturnType<typeof createClient>>;

export const AVTALEFELT =
  "id, household_id, tittel, start_dato, start_tid, slutt_dato, slutt_tid, sted, gjentakelse, gjentas_til, created_by, avlyst_at, deltakere(person_id)";

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
};

export type Avtale = Omit<AvtaleRad, "deltakere"> & { personer: string[] };

export function tilAvtale(rad: AvtaleRad): Avtale {
  const { deltakere, ...resten } = rad;
  return { ...resten, personer: deltakere.map((d) => d.person_id) };
}

/** Avtaler som ikke er avlyst og som varer helt eller delvis fra og med `fra` til og med `til`. */
export async function hentAvtaler(supabase: Klient, husstand: string, fra: string, til: string): Promise<Avtale[]> {
  const { data, error } = await supabase
    .schema("kalender")
    .from("avtaler")
    .select(AVTALEFELT)
    .eq("household_id", husstand)
    .is("avlyst_at", null)
    .lte("start_dato", til)
    .gte("slutt_dato", fra)
    .order("start_dato")
    .order("start_tid", { nullsFirst: true });
  if (error) throw new Error(error.message);
  return (data as AvtaleRad[]).map(tilAvtale);
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
    .gte("avtale.slutt_dato", idag)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as (Omit<Varsel, "avtale"> & { avtale: AvtaleRad })[]).map((v) => ({ ...v, avtale: tilAvtale(v.avtale) }));
}
