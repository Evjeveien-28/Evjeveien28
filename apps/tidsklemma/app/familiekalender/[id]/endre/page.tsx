import { createClient } from "@hjem/db/server";
import { notFound } from "next/navigation";
import { hentPersoner } from "../../../husstand/personer";
import { Side } from "../../../side";
import { AVTALEFELT, tilAvtale, type AvtaleRad } from "../../data";
import { Feilmelding } from "../../feil";
import { AvtaleSkjema } from "../../skjema";
import { iDag, leggTilDager } from "../../tid";

export default async function EndreAvtale({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string }>;
}) {
  const [{ id }, { feil }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.schema("kalender").from("avtaler").select(AVTALEFELT).eq("id", id).is("avlyst_at", null).maybeSingle();
  if (!data) notFound();
  const avtale = tilAvtale(data as AvtaleRad);
  const personer = await hentPersoner(supabase, avtale.household_id);
  const idag = iDag();

  return (
    <Side tittel="Endre" tilbake={{ href: `/familiekalender/${id}`, navn: avtale.tittel }}>
      <Feilmelding feil={feil} />
      <AvtaleSkjema
        husstand={avtale.household_id}
        personer={personer}
        avtale={avtale}
        dato={avtale.start_dato}
        idag={idag}
        imorgen={leggTilDager(idag, 1)}
      />
      <p className="dempet liten">De andre får varsel hvis du endrer dag, klokkeslett eller hvem som skal være med.</p>
    </Side>
  );
}
