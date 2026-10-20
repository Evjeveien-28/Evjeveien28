/** Datoer som `YYYY-MM-DD` i norsk tid. Felles for delene. */

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

export function erGyldigDato(dato: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dato) && !Number.isNaN(Date.parse(`${dato}T12:00:00Z`));
}

const tidformat = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Klokkeslettet nå i norsk tid, som `HH:MM`. */
export function naa(): string {
  return tidformat.format(new Date()).replace(".", ":");
}
