import type { Person } from "../husstand/personer";
import { erOver, hvemTekst, type Forekomst } from "./data";
import { ukedag } from "./tid";

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

/** Kort oppsummering av uken i vanlig tekst, øverst i kalenderen. */
export function oppsummering(uke: { dato: string; forekomster: Forekomst[] }[], naa: string, personer: Person[]): string[] {
  const [idag, imorgen, ...resten] = uke;
  if (uke.every((d) => d.forekomster.length === 0)) return ["Ingenting i kalenderen den neste uken."];

  const linjer: string[] = [];
  const kommer = idag!.forekomster.filter((f) => !erOver(f, naa));
  if (kommer.length) linjer.push(`I dag: ${dagListe(kommer, personer)}.`);
  else linjer.push(idag!.forekomster.length ? "Ingenting mer i dag." : "Ingenting i dag.");

  linjer.push(imorgen!.forekomster.length ? `I morgen: ${dagListe(imorgen!.forekomster, personer)}.` : "Ingenting i morgen.");

  // Avtaler over flere dager telles én gang, på dagen de starter eller der uken begynner.
  const sett = new Set([...idag!.forekomster, ...imorgen!.forekomster].map((f) => f.avtale.id));
  const perDag = resten.map((d) => {
    let n = 0;
    for (const f of d.forekomster) {
      if (sett.has(f.avtale.id)) continue;
      sett.add(f.avtale.id);
      n++;
    }
    return n;
  });
  const antall = perDag.reduce((a, b) => a + b, 0);
  if (antall === 0) linjer.push("Rolig resten av uken.");
  else {
    const mest = Math.max(...perDag);
    const travleste = perDag.filter((n) => n === mest).length === 1 && mest > 1 ? resten[perDag.indexOf(mest)]!.dato : null;
    linjer.push(
      `Resten av uken: ${antall} ${antall === 1 ? "avtale" : "avtaler"}${travleste ? `, mest på ${ukedag(travleste)}` : ""}.`,
    );
  }
  return linjer;
}
