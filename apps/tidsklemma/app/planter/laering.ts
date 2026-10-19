import { dagerMellom, erVinter } from "./tid";

/** Hvor mange av de siste intervallene i en årstid som brukes, og hvor mange som trengs. */
export const SISTE_INTERVALLER = 6;
export const MINST_INTERVALLER = 4;

export type Arstid = "sommer" | "vinter";
export type Laert = { dager: number; antall: number } | null;

export function arstid(dato: string): Arstid {
  return erVinter(dato) ? "vinter" : "sommer";
}

function median(tall: number[]) {
  const s = [...tall].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Lærer intervallet for hver årstid fra vanningene.
 *
 * - Intervallet er dager mellom to vanninger. Vanninger merket «telles ikke med» bryter rekken.
 * - Intervaller som går over et årstidsskifte, regnes ikke med.
 * - Uteliggere under halvparten eller over det dobbelte av utgangspunktet (manuelt, ellers standard) forkastes.
 * - Medianen av de siste intervallene brukes, og bare når det finnes nok av dem.
 */
export function laerIntervall(
  vanninger: { dato: string; telles_ikke: boolean }[],
  utgangspunkt: Record<Arstid, number>,
): Record<Arstid, Laert> {
  const sortert = [...vanninger].sort((a, b) => a.dato.localeCompare(b.dato));
  const intervaller: Record<Arstid, number[]> = { sommer: [], vinter: [] };

  for (let i = 1; i < sortert.length; i++) {
    const forrige = sortert[i - 1]!;
    const denne = sortert[i]!;
    if (forrige.telles_ikke || denne.telles_ikke) continue;
    const a = arstid(forrige.dato);
    if (a !== arstid(denne.dato)) continue;
    const dager = dagerMellom(forrige.dato, denne.dato);
    const basis = utgangspunkt[a];
    if (dager < basis / 2 || dager > basis * 2) continue;
    intervaller[a].push(dager);
  }

  const resultat = (a: Arstid): Laert => {
    const siste = intervaller[a].slice(-SISTE_INTERVALLER);
    if (siste.length < MINST_INTERVALLER) return null;
    return { dager: Math.max(1, Math.round(median(siste))), antall: siste.length };
  };
  return { sommer: resultat("sommer"), vinter: resultat("vinter") };
}

export type Kilde = "laert" | "manuelt" | "standard";

export type Intervallvalg = {
  dager: number;
  kilde: Kilde;
  standard: number;
  manuelt: number | null;
  laert: Laert;
  /** Automatisk justering er på både for husstanden og planten. */
  auto: boolean;
};

/** Prioritet: lært (når automatisk justering er på), så manuelt, så standard. */
export function velgIntervall(
  a: Arstid,
  plante: { standard: number; manuelt: number | null },
  laert: Laert,
  auto: boolean,
): Intervallvalg {
  const felles = { standard: plante.standard, manuelt: plante.manuelt, laert, auto };
  if (auto && laert) return { ...felles, dager: laert.dager, kilde: "laert" };
  if (plante.manuelt) return { ...felles, dager: plante.manuelt, kilde: "manuelt" };
  return { ...felles, dager: plante.standard, kilde: "standard" };
}
