/** Datoer som `YYYY-MM-DD` i norsk tid. Vanning registreres per dag, ikke per klokkeslett. */

const datoformat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" });

export function iDag(): string {
  return datoformat.format(new Date());
}

export function leggTilDager(dato: string, dager: number): string {
  const d = new Date(`${dato}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dager);
  return d.toISOString().slice(0, 10);
}

/** Antall dager fra `fra` til `til` (positivt når `til` er senere). */
export function dagerMellom(fra: string, til: string): number {
  return Math.round((Date.parse(`${til}T12:00:00Z`) - Date.parse(`${fra}T12:00:00Z`)) / 86_400_000);
}

/** Oktober–mars bruker vinterintervallet. */
export function erVinter(dato: string): boolean {
  const maned = Number(dato.slice(5, 7));
  return maned >= 10 || maned <= 3;
}

export function erGyldigDato(dato: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dato) && !Number.isNaN(Date.parse(`${dato}T12:00:00Z`));
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
