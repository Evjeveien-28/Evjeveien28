import { dagerMellom } from "../dato";

export { dagerMellom, erGyldigDato, iDag, leggTilDager, naa } from "../dato";

const dagFormat = new Intl.DateTimeFormat("nb-NO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const ukedagFormat = new Intl.DateTimeFormat("nb-NO", { weekday: "long", timeZone: "UTC" });
const kortFormat = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });
const manedKortFormat = new Intl.DateTimeFormat("nb-NO", { month: "short", timeZone: "UTC" });

const somDato = (dato: string) => new Date(`${dato}T12:00:00Z`);

/** «tir. 20. okt.» */
export function dagTekst(dato: string): string {
  return dagFormat.format(somDato(dato));
}

/** «tirsdag» */
export function ukedag(dato: string): string {
  return ukedagFormat.format(somDato(dato));
}

/** «19. okt. – 22. nov.» */
export function periodeTekst(fra: string, til: string): string {
  return `${kortFormat.format(somDato(fra))} – ${kortFormat.format(somDato(til))}`;
}

/** «nov.» */
export function manedKort(dato: string): string {
  return manedKortFormat.format(somDato(dato));
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
