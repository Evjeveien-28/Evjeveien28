import type { Person } from "../husstand/personer";
import { erOver, hvemTekst, type Forekomst } from "./data";

function liste(deler: string[]): string {
  if (deler.length <= 1) return deler[0] ?? "";
  return `${deler.slice(0, -1).join(", ")} og ${deler.at(-1)}`;
}

function kort(f: Forekomst, personer: Person[]): string {
  const tid = f.fra ? ` kl. ${f.fra}` : f.til ? ` til ${f.til}` : "";
  const hvem = hvemTekst(f.avtale.personer, personer);
  return `${f.avtale.tittel}${tid}${hvem ? ` (${hvem === "Alle" ? "alle" : hvem})` : ""}`;
}

function dagListe(fs: Forekomst[], personer: Person[]): string {
  const vis = fs.slice(0, 3).map((f) => kort(f, personer));
  if (fs.length > 3) vis.push(`${fs.length - 3} til`);
  return liste(vis);
}

/** Kort oppsummering av i dag og i morgen, øverst i kalenderen. Resten av uken står under. */
export function oppsummering(idag: Forekomst[], imorgen: Forekomst[], naa: string, personer: Person[]): string[] {
  const kommer = idag.filter((f) => !erOver(f, naa));
  if (kommer.length === 0 && imorgen.length === 0) return [idag.length ? "Ingenting mer i dag eller i morgen." : "Ingenting i dag eller i morgen."];
  return [
    kommer.length ? `I dag: ${dagListe(kommer, personer)}.` : idag.length ? "Ingenting mer i dag." : "Ingenting i dag.",
    imorgen.length ? `I morgen: ${dagListe(imorgen, personer)}.` : "Ingenting i morgen.",
  ];
}
