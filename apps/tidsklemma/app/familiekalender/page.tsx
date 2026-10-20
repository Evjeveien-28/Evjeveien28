import Link from "next/link";
import { createClient } from "@hjem/db/server";
import { DatabaseFeil } from "../database-feil";
import { hentPersoner, type Person } from "../husstand/personer";
import { hentHusstand } from "../planter/data";
import { Side } from "../side";
import { AvtaleRad } from "./avtalerad";
import { dager, erOver, forekomsterPaDag, hentAvtaler, hentVarsler, type Avtale, type Varsel } from "./data";
import { Nytt } from "./nytt";
import { oppsummering } from "./oppsummering";
import { dagTekst, erGyldigDato, iDag, leggTilDager, manedKort, naa, periodeTekst, relativDag, ukedagNr } from "./tid";

const tilbake = { href: "/", navn: "Tilbake" };
const nyKnapp = (dato?: string) => (
  <Link href={dato ? `/familiekalender/ny?dato=${dato}` : "/familiekalender/ny"} className="pluss" aria-label="Ny avtale">
    +
  </Link>
);

export default async function Familiekalender({
  searchParams,
}: {
  searchParams: Promise<{ vis?: string; fra?: string; dag?: string }>;
}) {
  const sok = await searchParams;
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  if (!husstand) {
    return (
      <Side tittel="Familiekalender" tilbake={tilbake}>
        <p>Du er ikke medlem av en husstand ennå.</p>
      </Side>
    );
  }

  const idag = iDag();
  const klokka = naa();
  // Måned viser alltid fem uker fra og med en mandag, så man ser inn i neste måned mot slutten av denne.
  const ukestart = leggTilDager(idag, -ukedagNr(idag));
  const femUker =
    sok.vis === "maaned"
      ? sok.fra && erGyldigDato(sok.fra) && ukedagNr(sok.fra) === 0 && sok.fra > ukestart
        ? sok.fra
        : ukestart
      : null;
  const fra = idag;
  const til = femUker ? leggTilDager(femUker, 34) : leggTilDager(idag, 6);

  let avtaler: Avtale[], personer: Person[], varsler: Varsel[];
  try {
    [avtaler, personer, varsler] = await Promise.all([
      hentAvtaler(supabase, husstand.id, fra, til),
      hentPersoner(supabase, husstand.id),
      hentVarsler(supabase, idag),
    ]);
  } catch (e) {
    return (
      <Side tittel="Familiekalender" tilbake={tilbake}>
        <DatabaseFeil
          melding={e instanceof Error ? e.message : String(e)}
          hva="kalenderen"
          schema="kalender"
          tabeller="kalender-tabellene og public.household_people"
        />
      </Side>
    );
  }

  const valg = (
    <nav className="segment" aria-label="Visning">
      <Link href="/familiekalender" aria-current={femUker ? undefined : "page"}>
        Uke
      </Link>
      <Link href="/familiekalender?vis=maaned" aria-current={femUker ? "page" : undefined}>
        Måned
      </Link>
    </nav>
  );

  if (femUker) {
    const sluttdag = leggTilDager(femUker, 34);
    const valgtDag = sok.dag && erGyldigDato(sok.dag) && sok.dag >= idag && sok.dag >= femUker && sok.dag <= sluttdag ? sok.dag : femUker === ukestart ? idag : null;
    const alleDager = dager(femUker, 35);
    const hovedmaned = (femUker > idag ? femUker : idag).slice(0, 7);
    const forrige = leggTilDager(femUker, -35) > ukestart ? leggTilDager(femUker, -35) : ukestart;
    return (
      <Side tittel="Familiekalender" tilbake={tilbake} handling={nyKnapp(valgtDag ?? undefined)}>
        {valg}
        <div className="maned-topp">
          {femUker > ukestart ? (
            <Link href={`/familiekalender?vis=maaned&fra=${forrige}`} className="maned-pil" aria-label="Forrige fem uker">
              ‹
            </Link>
          ) : (
            <span className="maned-pil" aria-hidden="true" />
          )}
          <h3>{periodeTekst(femUker, sluttdag)}</h3>
          <Link href={`/familiekalender?vis=maaned&fra=${leggTilDager(femUker, 35)}`} className="maned-pil" aria-label="Neste fem uker">
            ›
          </Link>
        </div>
        <div className="maned">
          {["M", "T", "O", "T", "F", "L", "S"].map((d, i) => (
            <span key={i} className="maned-ukedag" aria-hidden="true">
              {d}
            </span>
          ))}
          {alleDager.map((dato) => {
            const fs = dato >= idag ? forekomsterPaDag(avtaler, dato) : [];
            // Én prikk per person som skal noe denne dagen, også når alle skal.
            const prikker = personer.filter((x) => fs.some((f) => f.avtale.personer.includes(x.id)));
            // Måneden vi er i (eller den perioden starter i) er hvit, og neste måned beige.
            const annenManed = dato.slice(0, 7) !== hovedmaned;
            const klasse = ["maned-dag", annenManed && "annen", dato === idag && "idag", dato === valgtDag && "valgt", dato < idag && "forbi"]
              .filter(Boolean)
              .join(" ");
            const innhold = (
              <>
                {dato.endsWith("-01") && <span className="maned-navn">{manedKort(dato)}</span>}
                <span className="maned-nr">{Number(dato.slice(8))}</span>
                <span className="maned-prikker">
                  {prikker.map((x) => (
                    <i key={x.id} style={{ background: x.farge }} />
                  ))}
                </span>
              </>
            );
            return dato < idag ? (
              <span key={dato} className={klasse}>
                {innhold}
              </span>
            ) : (
              <Link
                key={dato}
                href={`/familiekalender?vis=maaned&fra=${femUker}&dag=${dato}`}
                className={klasse}
               
                aria-label={`${dagTekst(dato)}, ${fs.length} ${fs.length === 1 ? "avtale" : "avtaler"}`}
                aria-current={dato === valgtDag ? "date" : undefined}
                scroll={false}
              >
                {innhold}
              </Link>
            );
          })}
        </div>

        {valgtDag && (
          <section className="dag">
            <p className="dag-topp">
              <b>{relativDag(valgtDag, idag)}</b> <span>{dagTekst(valgtDag)}</span>
            </p>
            {forekomsterPaDag(avtaler, valgtDag).length ? (
              <ul className="avtaler">
                {forekomsterPaDag(avtaler, valgtDag).map((f) => (
                  <AvtaleRad key={`${f.avtale.id}-${f.avtale.start_dato}`} f={f} personer={personer} over={valgtDag === idag && erOver(f, klokka)} />
                ))}
              </ul>
            ) : (
              <p className="ingenting">Ingenting</p>
            )}
            <Link href={`/familiekalender/ny?dato=${valgtDag}`} className="inline-knapp">
              Ny avtale denne dagen
            </Link>
          </section>
        )}
      </Side>
    );
  }

  const uke = dager(idag, 7).map((dato) => ({ dato, forekomster: forekomsterPaDag(avtaler, dato) }));
  const linjer = oppsummering(uke[0]!.forekomster, uke[1]!.forekomster, klokka, personer);

  return (
    <Side tittel="Familiekalender" tilbake={tilbake} handling={nyKnapp()}>
      {valg}
      <div className="kort oppsummering">
        {linjer.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>

      {varsler.length > 0 && <Nytt varsler={varsler} personer={personer} idag={idag} />}

      <ol className="uke">
        {uke.map(({ dato, forekomster }) => {
          const erIdag = dato === idag;
          const tidligere = erIdag ? forekomster.filter((f) => erOver(f, klokka)) : [];
          const kommer = erIdag ? forekomster.filter((f) => !erOver(f, klokka)) : forekomster;
          return (
            <li key={dato} className={erIdag ? "dag idag" : "dag"}>
              <p className="dag-topp">
                <b>{relativDag(dato, idag)}</b> <span>{dagTekst(dato)}</span>
              </p>
              {tidligere.length > 0 && (
                <details className="tidligere">
                  <summary>Tidligere i dag ({tidligere.length})</summary>
                  <ul className="avtaler">
                    {tidligere.map((f) => (
                      <AvtaleRad key={`${f.avtale.id}-${f.avtale.start_dato}`} f={f} personer={personer} over />
                    ))}
                  </ul>
                </details>
              )}
              {erIdag && kommer.length > 0 && (
                <div className="naa" role="img" aria-label={`Nå, klokka ${klokka}`}>
                  <span>{klokka}</span>
                </div>
              )}
              {kommer.length > 0 ? (
                <ul className="avtaler">
                  {kommer.map((f) => (
                    <AvtaleRad key={`${f.avtale.id}-${f.avtale.start_dato}`} f={f} personer={personer} />
                  ))}
                </ul>
              ) : (
                <p className="ingenting">{erIdag && tidligere.length ? "Ingenting mer i dag" : "Ingenting"}</p>
              )}
            </li>
          );
        })}
      </ol>

      <nav className="bunnmeny" aria-label="Familiekalender">
        <Link href="/familiekalender?vis=maaned">Se de neste fem ukene</Link>
      </nav>
    </Side>
  );
}
