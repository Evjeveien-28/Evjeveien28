import type { createClient } from "@hjem/db/server";

type Klient = Awaited<ReturnType<typeof createClient>>;

export const VAREFELT = "id, household_id, url, butikk, navn, bilde_url, ean, pris, startpris, pa_lager, onsket_pris, sist_sjekket, feil, created_at";

export type Vare = {
  id: string;
  household_id: string;
  url: string;
  butikk: string;
  navn: string;
  bilde_url: string | null;
  ean: string | null;
  pris: number;
  startpris: number;
  pa_lager: boolean | null;
  onsket_pris: number | null;
  sist_sjekket: string;
  feil: string | null;
  created_at: string;
};

export async function hentVarer(supabase: Klient, husstand: string): Promise<Vare[]> {
  const { data, error } = await supabase
    .schema("prisvakt")
    .from("varer")
    .select(VAREFELT)
    .eq("household_id", husstand)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Vare[]).map((v) => ({
    ...v,
    pris: Number(v.pris),
    startpris: Number(v.startpris),
    onsket_pris: v.onsket_pris == null ? null : Number(v.onsket_pris),
  }));
}

const kroner = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });

/** «1 899 kr», eller «49,90 kr» når det er øre. */
export function kr(n: number): string {
  return `${kroner.format(Math.round(n * 100) / 100)} kr`;
}

/** Hvordan prisen har gått siden vi begynte å følge varen. */
export function trend(v: Pick<Vare, "pris" | "startpris">): { klasse: "ned" | "opp" | "stabil"; tekst: string } {
  const diff = Math.round((v.pris - v.startpris) * 100) / 100;
  if (diff < 0) return { klasse: "ned", tekst: `▼ ${kroner.format(-diff)}` };
  if (diff > 0) return { klasse: "opp", tekst: `▲ ${kroner.format(diff)}` };
  return { klasse: "stabil", tekst: "▬ Stabil" };
}

export function underOnsket(v: Pick<Vare, "pris" | "onsket_pris">): boolean {
  return v.onsket_pris != null && v.pris <= v.onsket_pris;
}

/** «1 500», «1500,50» eller «1 500 kr» → tall. Tomt felt gir null. */
export function lesBelop(verdi: FormDataEntryValue | null): number | null | "feil" {
  const tekst = String(verdi ?? "").replace(/kr/i, "").replace(/\s/g, "").replace(",", ".");
  if (!tekst) return null;
  const n = Number(tekst);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : "feil";
}
