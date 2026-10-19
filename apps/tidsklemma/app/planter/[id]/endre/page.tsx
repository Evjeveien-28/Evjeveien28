import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { endre, slett } from "../../actions";
import { finnIKatalog, intervaller } from "../../katalog";
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
  const { data: p } = await supabase
    .schema("planter")
    .from("planter")
    .select("id, navn, katalog_id, plassering, sommer_dager, vinter_dager")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const art = finnIKatalog(p.katalog_id);
  const standard = art ? intervaller(art) : null;

  return (
    <>
      <Link href={`/planter/${p.id}`} className="tilbake">
        ← Tilbake
      </Link>
      <h2>Endre</h2>
      <div className="strek venstre" />

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

        <p className="kt">Vannes hver … dag</p>
        <div className="to-felt">
          <label>
            <span className="dempet liten">Sommer (apr.–sep.)</span>
            <input name="sommer" type="number" inputMode="numeric" min={1} max={120} required defaultValue={p.sommer_dager} className="felt" />
          </label>
          <label>
            <span className="dempet liten">Vinter (okt.–mar.)</span>
            <input name="vinter" type="number" inputMode="numeric" min={1} max={180} required defaultValue={p.vinter_dager} className="felt" />
          </label>
        </div>
        {standard && (
          <p className="dempet liten">
            Standard for {art!.navn}: hver {standard.sommer}. dag om sommeren, hver {standard.vinter}. om vinteren.
          </p>
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
    </>
  );
}
