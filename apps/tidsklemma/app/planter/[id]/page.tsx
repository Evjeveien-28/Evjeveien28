import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { Ikon } from "../../ikoner";
import { fjernVanning, settAuto, tellesIkke, tilbakestill, vann } from "../actions";
import { Angre } from "../angre";
import { beregnStatus, hentAutoJustering, hentHusstand, hentNavn, PLANTEFELT, type PlanteRad, type Vanning } from "../data";
import { finnIKatalog, intervaller } from "../katalog";
import { Intervallkort } from "../intervallkort";
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
    .select(`${PLANTEFELT}, vanninger(id, dato, registrert_av, etterregistrert, telles_ikke)`)
    .eq("id", id)
    .order("dato", { referencedTable: "vanninger", ascending: false })
    .maybeSingle();
  if (!data || !husstand) notFound();

  const { vanninger, ...rad } = data as PlanteRad & { vanninger: Vanning[] };
  const idag = iDag();
  const [fellesAuto, navn] = await Promise.all([hentAutoJustering(supabase, husstand.id), hentNavn(supabase, husstand.id)]);
  const p = beregnStatus(rad, vanninger, fellesAuto, idag);
  const art = finnIKatalog(p.katalog_id);
  const tips = art ? intervaller(art).tips : null;
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
          <small className="dempet">{[art?.latin ?? p.latinsk_navn, p.plassering].filter(Boolean).join(" · ")}</small>
        </div>
      </div>

      <div className="kort">
        <p className="kt">{p.intervall === 1 ? "Vannes hver dag" : `Vannes ca. hver ${p.intervall}. dag`}</p>
        <p>{status}</p>
        {tips && <p className="dempet liten">{tips}</p>}
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

      <Intervallkort plante={p} fellesAuto={fellesAuto} idag={idag} settAuto={settAuto} tilbakestill={tilbakestill} />

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
                {v.telles_ikke && <em className="dempet"> · telles ikke med</em>}
              </span>
              <form action={tellesIkke}>
                <input type="hidden" name="vanning" value={v.id} />
                <input type="hidden" name="verdi" value={v.telles_ikke ? "0" : "1"} />
                <input type="hidden" name="tilbake" value={sti} />
                <button type="submit" className="mini-lenke">
                  {v.telles_ikke ? "Tell med" : "Ikke tell"}
                </button>
              </form>
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

      <p className="dempet liten">
        «Ikke tell» holder en vanning utenfor når intervallet læres, f.eks. når du vannet ekstra før en ferie.
      </p>

      <div className="bunnmeny">
        <Link href={`${sti}/endre`}>Endre eller slett plante</Link>
      </div>

      {angreIder.length > 0 && <Angre vanninger={angreIder} dato={sok.dato} tilbake={sti} />}
    </>
  );
}
