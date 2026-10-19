import Link from "next/link";
import { createClient } from "@hjem/db/server";
import { Ikon } from "../ikoner";
import { vann } from "./actions";
import { Angre } from "./angre";
import { NyPlanteKnapp } from "./ny-knapp";
import { hentHusstand, hentNavn, hentPlanter, type PlanteStatus } from "./data";
import { Plantebilde } from "./plantebilde";
import { kortDato, sidenTekst } from "./tid";

function statusTekst(p: PlanteStatus) {
  if (!p.sistVannet) return { tekst: "Ikke registrert ennå", klasse: "s-idag" };
  if (p.dagerIgjen < 0) return { tekst: `${-p.dagerIgjen} ${p.dagerIgjen === -1 ? "dag" : "dager"} på overtid`, klasse: "s-over" };
  if (p.dagerIgjen === 0) return { tekst: "I dag", klasse: "s-idag" };
  if (p.dagerIgjen === 1) return { tekst: "I morgen", klasse: "s-ok" };
  return { tekst: `Om ${p.dagerIgjen} dager`, klasse: "s-ok" };
}

export default async function Planter({
  searchParams,
}: {
  searchParams: Promise<{ angre?: string | string[]; dato?: string; allerede?: string; feil?: string }>;
}) {
  const sok = await searchParams;
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);

  const tilbake = (
    <Link href="/" className="tilbake">
      ← Tilbake
    </Link>
  );
  if (!husstand) {
    return (
      <>
        {tilbake}
        <h2>Planter</h2>
        <p>Du er ikke medlem av en husstand ennå.</p>
      </>
    );
  }

  const [planter, navn] = await Promise.all([hentPlanter(supabase, husstand.id), hentNavn(supabase, husstand.id)]);
  const trenger = planter.filter((p) => p.trengerVann);
  const senere = planter.filter((p) => !p.trengerVann);
  const angreIder = ([] as string[]).concat(sok.angre ?? []);

  const rad = (p: PlanteStatus, viktig: boolean) => {
    const status = statusTekst(p);
    const info = [
      p.plassering,
      p.sistVannet && `vannet ${sidenTekst(p.sistVannet)}${navn(p.sistVannetAv) ? ` av ${navn(p.sistVannetAv)}` : ""}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <li key={p.id} className="plante">
        <Link href={`/planter/${p.id}`} className="plante-lenke">
          <Plantebilde katalogId={p.katalog_id} />
          <span className="pt">
            <b>{p.navn}</b>
            {info && <small>{info}</small>}
            <span className={`status ${status.klasse}`}>{status.tekst}</span>
          </span>
        </Link>
        <form action={vann}>
          <input type="hidden" name="plante" value={p.id} />
          <button type="submit" className={viktig ? "vannet" : "inline-vann"} aria-label={`Vannet ${p.navn}`}>
            <Ikon navn="vask" storrelse={viktig ? 18 : 15} />
            Vannet
          </button>
        </form>
      </li>
    );
  };

  return (
    <>
      {tilbake}
      <div className="tittelrad">
        <h2>Planter</h2>
        <NyPlanteKnapp />
      </div>
      <div className="strek venstre" />

      {sok.feil && <p className="feil">Det gikk ikke å lagre. Prøv igjen.</p>}
      {sok.allerede && <p className="dempet">Allerede registrert som vannet {kortDato(sok.allerede)}</p>}

      {planter.length === 0 ? (
        <div className="kort stiplet">
          <p className="kt">Ingen planter ennå</p>
          <p>Trykk «+» og ta bilde av den første planten.</p>
        </div>
      ) : (
        <>
          {trenger.length === 0 ? (
            <div className="kort">
              <p className="kt">Trenger vann</p>
              <p>
                Alt er vannet.
                {senere[0] && ` Neste: ${senere[0].navn} ${senere[0].dagerIgjen === 1 ? "i morgen" : `om ${senere[0].dagerIgjen} dager`}.`}
              </p>
            </div>
          ) : (
            <>
              <div className="seksjonstopp">
                <p className="kt">Trenger vann · {trenger.length}</p>
                {trenger.length > 1 && (
                  <form action={vann}>
                    {trenger.map((p) => (
                      <input key={p.id} type="hidden" name="plante" value={p.id} />
                    ))}
                    <button type="submit" className="sekundar alle">
                      <Ikon navn="vask" storrelse={18} />
                      Vannet alle
                    </button>
                  </form>
                )}
              </div>
              <ul className="pliste">{trenger.map((p) => rad(p, true))}</ul>
            </>
          )}
          {senere.length > 0 && (
            <>
              <p className="kt">Senere</p>
              <ul className="pliste">{senere.map((p) => rad(p, false))}</ul>
            </>
          )}
        </>
      )}

      <nav className="bunnmeny" aria-label="Planter">
        <Link href="/planter/ny">Legg til uten bilde</Link>
        <span aria-hidden="true">·</span>
        <Link href="/planter/innstillinger">Innstillinger</Link>
      </nav>

      {angreIder.length > 0 && <Angre vanninger={angreIder} dato={sok.dato} tilbake="/planter" />}
    </>
  );
}
