import { Side } from "../../../side";
import { notFound } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { endre, slett } from "../../actions";
import { hentAutoJustering, hentHusstand, PLANTEFELT, type PlanteRad } from "../../data";
import { SlettKnapp } from "./slett-knapp";

export default async function EndrePlante({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string }>;
}) {
  const [{ id }, { feil }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const [{ data }, husstand] = await Promise.all([
    supabase.schema("planter").from("planter").select(PLANTEFELT).eq("id", id).maybeSingle(),
    hentHusstand(supabase),
  ]);
  if (!data || !husstand) notFound();
  const p = data as PlanteRad;
  const autoPa = p.auto_justering && (await hentAutoJustering(supabase, husstand.id));

  return (
    <Side tittel="Endre" tilbake={{ href: `/planter/${p.id}`, navn: p.navn }}>
      <form action={endre}>
        <input type="hidden" name="plante" value={p.id} />
        <label htmlFor="navn" className="kt">
          Navn
        </label>
        <input id="navn" name="navn" required maxLength={80} defaultValue={p.navn} className="felt" />
        <label htmlFor="plassering" className="kt">
          Plassering <span className="valgfritt">(valgfritt)</span>
        </label>
        <input id="plassering" name="plassering" maxLength={80} defaultValue={p.plassering ?? ""} className="felt" />

        <p className="kt">Vannes hver … dag, satt av deg</p>
        <div className="to-felt">
          <label>
            <span className="dempet liten">Sommer (apr.–sep.)</span>
            <input
              name="sommer"
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              defaultValue={p.manuelt_sommer ?? ""}
              placeholder={`Standard ${p.standard_sommer}`}
              className="felt"
            />
          </label>
          <label>
            <span className="dempet liten">Vinter (okt.–mar.)</span>
            <input
              name="vinter"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              defaultValue={p.manuelt_vinter ?? ""}
              placeholder={`Standard ${p.standard_vinter}`}
              className="felt"
            />
          </label>
        </div>
        <p className="dempet liten">
          Standard: hver {p.standard_sommer}. dag om sommeren og hver {p.standard_vinter}. om vinteren. La feltet stå tomt for å bruke
          standard.
        </p>

        {autoPa && (
          <fieldset className="kort">
            <legend className="kt">Automatisk justering er på</legend>
            <p>Hvis du setter egne verdier:</p>
            <label className="radio">
              <input type="radio" name="auto" value="av" defaultChecked />
              Slå av for denne planten, og bruk alltid mine verdier
            </label>
            <label className="radio">
              <input type="radio" name="auto" value="pa" />
              Lær videre, med mine verdier som utgangspunkt
            </label>
          </fieldset>
        )}

        {feil && <p className="feil">Sjekk navnet og antall dager.</p>}
        <button type="submit" className="primar" style={{ marginTop: 8 }}>
          Lagre
        </button>
      </form>

      <form action={slett} className="bunnknapper">
        <input type="hidden" name="plante" value={p.id} />
        <SlettKnapp navn={p.navn} />
      </form>
    </Side>
  );
}
