import { dagerMellom } from "../dato";

export { dagerMellom, erGyldigDato, iDag, leggTilDager, naa } from "../dato";

const dagFormat = new Intl.DateTimeFormat("nb-NO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const ukedagFormat = new Intl.DateTimeFormat("nb-NO", { weekday: "long", timeZone: "UTC" });
const manedFormat = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric", timeZone: "UTC" });

const somDato = (dato: string) => new Date(`${dato}T12:00:00Z`);

/** «tir. 20. okt.» */
export function dagTekst(dato: string): string {
  return dagFormat.format(somDato(dato));
}

/** «tirsdag» */
export function ukedag(dato: string): string {
  return ukedagFormat.format(somDato(dato));
}

/** «Oktober 2026» */
export function manedTekst(maned: string): string {
  const t = manedFormat.format(somDato(`${maned}-01`));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** «I dag», «I morgen» eller «Tirsdag». */
export function relativDag(dato: string, idag: string): string {
  const n = dagerMellom(idag, dato);
  if (n === 0) return "I dag";
  if (n === 1) return "I morgen";
  const d = ukedag(dato);
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/** `17:30:00` → `17:30` */
export function kl(tid: string | null): string | null {
  return tid ? tid.slice(0, 5) : null;
}

/** Mandag = 0 … søndag = 6. */
export function ukedagNr(dato: string): number {
  return (somDato(dato).getUTCDay() + 6) % 7;
}

export function antallDagerIManed(maned: string): number {
  const [a, m] = maned.split("-").map(Number);
  return new Date(Date.UTC(a!, m!, 0)).getUTCDate();
}

export function nesteManed(maned: string, n = 1): string {
  const [a, m] = maned.split("-").map(Number);
  const d = new Date(Date.UTC(a!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
