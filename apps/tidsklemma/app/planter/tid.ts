/** Vanning registreres per dag, ikke per klokkeslett. */
import { dagerMellom, iDag } from "../dato";

export { dagerMellom, erGyldigDato, iDag, leggTilDager } from "../dato";

/** Oktober–mars bruker vinterintervallet. */
export function erVinter(dato: string): boolean {
  const maned = Number(dato.slice(5, 7));
  return maned >= 10 || maned <= 3;
}

const kort = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });

export function kortDato(dato: string): string {
  return kort.format(new Date(`${dato}T12:00:00Z`));
}

/** «i dag», «i går», «for 3 dager siden». */
export function sidenTekst(dato: string, idag = iDag()): string {
  const n = dagerMellom(dato, idag);
  if (n <= 0) return "i dag";
  if (n === 1) return "i går";
  return `for ${n} dager siden`;
}
