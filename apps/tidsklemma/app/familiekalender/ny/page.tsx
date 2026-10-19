import { createClient } from "@hjem/db/server";
import { notFound } from "next/navigation";
import { hentPersoner } from "../../husstand/personer";
import { hentHusstand } from "../../planter/data";
import { Side } from "../../side";
import { Feilmelding } from "../feil";
import { AvtaleSkjema } from "../skjema";
import { erGyldigDato, iDag, leggTilDager } from "../tid";

export default async function NyAvtale({ searchParams }: { searchParams: Promise<{ dato?: string; feil?: string }> }) {
  const { dato, feil } = await searchParams;
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  if (!husstand) notFound();
  const personer = await hentPersoner(supabase, husstand.id);
  const idag = iDag();

  return (
    <Side tittel="Ny avtale" tilbake={{ href: "/familiekalender", navn: "Familiekalender" }}>
      <Feilmelding feil={feil} />
      <AvtaleSkjema
        husstand={husstand.id}
        personer={personer}
        dato={dato && erGyldigDato(dato) && dato >= idag ? dato : idag}
        idag={idag}
        imorgen={leggTilDager(idag, 1)}
      />
    </Side>
  );
}
