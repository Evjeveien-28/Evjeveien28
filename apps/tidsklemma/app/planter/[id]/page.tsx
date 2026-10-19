import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { Ikon } from "../../ikoner";
import { fjernVanning, vann } from "../actions";
import { Angre } from "../angre";
import { beregnStatus, hentHusstand, hentNavn, type PlanteRad } from "../data";
import { finnIKatalog, grupper, intervaller } from "../katalog";
import { Plantebilde } from "../plantebilde";
import { iDag, kortDato, sidenTekst } from "../tid";

export default async function Plante({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ angre?: string | string[]; dato?: string; allerede?: string; feil?: string }>;
}) {
  const [{ id }, sok] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  const { data } = await supabase
    .schema("planter")
    .from("planter")
    .select("id, navn, katalog_id, plassering, sommer_dager, vinter_dager, vanninger(id, dato, registrert_av, etterregistrert)")
    .eq("id", id)
    .order("dato", { referencedTable: "vanninger", ascending: false })
    .maybeSingle();
  if (!data || !husstand) notFound();

  const { vanninger, ...rad } = data as PlanteRad & {
    vanninger: { id: string; dato: string; registrert_av: string | null; etterregistrert: boolean }[];
  };
  const idag = iDag();
  const p = beregnStatus(rad, vanninger[0], idag);
  const navn = await hentNavn(supabase, husstand.id);
  const art = finnIKatalog(p.katalog_id);
  const tips = art ? intervaller(art).tips : grupper.middels.tips;
  const sti = `/planter/${p.id}`;
  const angreIder = ([] as string[]).concat(sok.angre ?? []);

  let status: React.ReactNode;
  if (!p.sistVannet) status = "Ikke registrert vannet ennå.";
  else {
    const sist = `Sist vannet ${sidenTekst(p.sistVannet, idag)}.`;
    if (p.dagerIgjen < 0) status = <>{sist} <b>{-p.dagerIgjen} {p.dagerIgjen === -1 ? "dag" : "dager"} på overtid.</b></>;
    else if (p.dagerIgjen === 0) status = <>{sist} <b>Skal vannes i dag.</b></>;
    else status = <>{sist} Neste gang {p.dagerIgjen === 1 ? "i morgen" : `om ${p.dagerIgjen} dager`}.</>;
  }

  return (
    <>
      <Link href="/planter" className="tilbake">
        ← Planter
      </Link>
      <div className="detaljtopp">
        <Plantebilde katalogId={p.katalog_id} storrelse={72} />
        <div>
          <h2 className="h2m">{p.navn}</h2>
          <small className="dempet">{[art?.latin, p.plassering].filter(Boolean).join(" · ")}</small>
        </div>
      </div>

      <div className="kort">
        <p className="kt">Vannes ca. hver {p.intervall}. dag</p>
        <p>{status}</p>
        <p className="dempet liten">{tips}</p>
      </div>

      <form action={vann}>
        <input type="hidden" name="plante" value={p.id} />
        <input type="hidden" name="tilbake" value={sti} />
        <button type="submit" className="primar">
          <Ikon navn="vask" storrelse={20} />
          Vannet nå
        </button>
      </form>

      <p className="kt" style={{ marginTop: 20 }}>
        Glemt å registrere?
      </p>
      <div className="knapperad">
        {[1, 2].map((n) => (
          <form key={n} action={vann}>
            <input type="hidden" name="plante" value={p.id} />
            <input type="hidden" name="tilbake" value={sti} />
            <input type="hidden" name="dager-siden" value={n} />
            <button type="submit" className="sekundar">
              {n === 1 ? "I går" : "2 dager siden"}
            </button>
          </form>
        ))}
      </div>
      <form action={vann} className="datovalg">
        <input type="hidden" name="plante" value={p.id} />
        <input type="hidden" name="tilbake" value={sti} />
        <label htmlFor="dato" className="dempet liten">
          Eller velg dato
        </label>
        <div className="knapperad">
          <input id="dato" name="dato" type="date" max={idag} required className="felt" style={{ margin: 0, flex: 1 }} />
          <button type="submit" className="sekundar">
            Registrer
          </button>
        </div>
      </form>
      {sok.feil === "dato" && <p className="feil">Velg en dato som ikke er i fremtiden.</p>}
      {sok.allerede && <p className="dempet">Allerede registrert som vannet {kortDato(sok.allerede)}</p>}

      <p className="kt" style={{ marginTop: 24 }}>
        Historikk
      </p>
      {vanninger.length === 0 ? (
        <p className="dempet">Ingen vanninger registrert.</p>
      ) : (
        <ul className="historikk">
          {vanninger.slice(0, 20).map((v) => (
            <li key={v.id}>
              <span>{kortDato(v.dato)}</span>
              <span className="historikk-hvem">
                {navn(v.registrert_av) ?? "ukjent"}
                {v.etterregistrert && <em className="dempet"> (etterregistrert)</em>}
              </span>
              <form action={fjernVanning}>
                <input type="hidden" name="vanning" value={v.id} />
                <input type="hidden" name="tilbake" value={sti} />
                <button type="submit" className="fjern" aria-label={`Fjern vanning ${kortDato(v.dato)}`}>
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="bunnmeny">
        <Link href={`${sti}/endre`}>Endre eller slett plante</Link>
      </div>

      {angreIder.length > 0 && <Angre vanninger={angreIder} dato={sok.dato} tilbake={sti} />}
    </>
  );
}
