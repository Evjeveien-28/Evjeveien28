import type { createClient } from "@hjem/db/server";

type Klient = Awaited<ReturnType<typeof createClient>>;

/** Samme rekkefølge som `public.ledig_farge` i databasen. */
export const FARGER = [
  { hex: "#66723f", navn: "Avokado" },
  { hex: "#2f5e5b", navn: "Petrol" },
  { hex: "#c9962e", navn: "Sennep" },
  { hex: "#8e7ca8", navn: "Lavendel" },
  { hex: "#5b86a8", navn: "Blå" },
  { hex: "#734623", navn: "Brun" },
  { hex: "#b8664e", navn: "Terrakotta" },
  { hex: "#c98c8c", navn: "Rosa" },
] as const;

export type Person = { id: string; household_id: string; user_id: string | null; navn: string; farge: string };

export async function hentPersoner(supabase: Klient, husstand: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("household_people")
    .select("id, household_id, user_id, navn, farge")
    .eq("household_id", husstand)
    .order("created_at")
    .order("navn");
  if (error) throw new Error(error.message);
  return data as Person[];
}

export function ledigFarge(personer: Person[]) {
  return FARGER.find((f) => !personer.some((p) => p.farge === f.hex))?.hex ?? FARGER[0].hex;
}

export function rensNavn(verdi: FormDataEntryValue | null) {
  return String(verdi ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
}
