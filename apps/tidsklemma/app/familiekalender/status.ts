import type { createClient } from "@hjem/db/server";
import { dager, erOver, forekomsterPaDag, hentAvtaler, hentVarsler } from "./data";
import { dagTekst, iDag, leggTilDager, naa, relativDag } from "./tid";

type Klient = Awaited<ReturnType<typeof createClient>>;

/** Rød prikk for usette varsler, og det neste som skjer, til flisen på startsiden. */
export async function kalenderStatus(supabase: Klient, husstand: string) {
  const idag = iDag();
  const klokka = naa();
  const [avtaler, varsler] = await Promise.all([hentAvtaler(supabase, husstand, idag, leggTilDager(idag, 30)), hentVarsler(supabase, idag)]);
  let tekst = "Ingenting planlagt";
  for (const dato of dager(idag, 31)) {
    const neste = forekomsterPaDag(avtaler, dato).find((f) => dato !== idag || !erOver(f, klokka));
    if (neste) {
      const dag = dato <= leggTilDager(idag, 6) ? relativDag(dato, idag) : dagTekst(dato);
      tekst = `${dag}${neste.fra ? ` ${neste.fra}` : ""}: ${neste.avtale.tittel}`;
      break;
    }
  }
  return { antall: varsler.length, tekst };
}
