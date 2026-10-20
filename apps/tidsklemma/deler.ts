import type { IkonNavn } from "./app/ikoner";

/** Delene av Tidsklemma. Hver del har sin egen mappe under `app/` og sitt eget schema i Supabase. */
export const deler: {
  slug: string;
  /** Lange navn kan deles over to linjer på flisen med `\n`. */
  navn: string;
  beskrivelse: string;
  ikon: IkonNavn;
  /** Flisfarge på startsiden. Uten farge går flisene på rundgang: brun, lyseblå, grønn, krem. */
  farge?: "brun" | "blaa" | "gronn" | "krem";
}[] = [
  { slug: "familiekalender", navn: "Familie\nkalender", beskrivelse: "Hvem skal hvor", ikon: "kalender", farge: "blaa" },
  { slug: "planter", navn: "Planter", beskrivelse: "Vanning", ikon: "plante", farge: "gronn" },
];
