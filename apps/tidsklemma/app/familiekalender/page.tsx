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
import { antallDagerIManed, dagTekst, erGyldigDato, iDag, leggTilDager, manedTekst, naa, nesteManed, relativDag, ukedagNr } from "./tid";

const tilbake = { href: "/", navn: "Tilbake" };
const nyKnapp = (dato?: string) => (
  <Link href={dato ? `/familiekalender/ny?dato=${dato}` : "/familiekalender/ny"} className="pluss" aria-label="Ny avtale">
    +
  </Link>
);

export default async function Familiekalender({
  searchParams,
}: {
  searchParams: Promise<{ vis?: string; m?: string; dag?: string }>;
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
  const denneManed = idag.slice(0, 7);
  const maned = sok.vis === "maaned" ? (/^\d{4}-\d{2}$/.test(sok.m ?? "") && sok.m! > denneManed ? sok.m! : denneManed) : null;
  const fra = maned ? (maned === denneManed ? idag : `${maned}-01`) : idag;
  const til = maned ? `${maned}-${antallDagerIManed(maned)}` : leggTilDager(idag, 6);

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
      <Link href="/familiekalender" aria-current={maned ? undefined : "page"}>
        Uke
      </Link>
      <Link href="/familiekalender?vis=maaned" aria-current={maned ? "page" : undefined}>
        Måned
      </Link>
    </nav>
  );

  if (maned) {
    const valgtDag = sok.dag && erGyldigDato(sok.dag) && sok.dag.startsWith(maned) && sok.dag >= idag ? sok.dag : maned === denneManed ? idag : null;
    // Denne måneden starter på uken vi er i. Det som har vært, vises ikke.
    const ukestart = leggTilDager(idag, -ukedagNr(idag));
    const forste = maned === denneManed && ukestart > `${maned}-01` ? ukestart : `${maned}-01`;
    const forsteUkedag = ukedagNr(forste);
    const alleDager = dager(forste, antallDagerIManed(maned) - Number(forste.slice(8)) + 1);
    return (
      <Side tittel="Familiekalender" tilbake={tilbake} handling={nyKnapp(valgtDag ?? undefined)}>
        {valg}
        <div className="maned-topp">
          {maned > denneManed ? (
            <Link href={`/familiekalender?vis=maaned&m=${nesteManed(maned, -1)}`} className="maned-pil" aria-label="Forrige måned">
              ‹
            </Link>
          ) : (
            <span className="maned-pil" aria-hidden="true" />
          )}
          <h3>{manedTekst(maned)}</h3>
          <Link href={`/familiekalender?vis=maaned&m=${nesteManed(maned)}`} className="maned-pil" aria-label="Neste måned">
            ›
          </Link>
        </div>
        <div className="maned">
          {["M", "T", "O", "T", "F", "L", "S"].map((d, i) => (
            <span key={i} className="maned-ukedag" aria-hidden="true">
              {d}
            </span>
          ))}
          {alleDager.map((dato, i) => {
            const fs = dato >= idag ? forekomsterPaDag(avtaler, dato) : [];
            const prikker = fs.flatMap((f) => {
              const p = personer.filter((x) => f.avtale.personer.includes(x.id));
              return p.length === personer.length && personer.length > 1 ? ["var(--valnott)"] : p.map((x) => x.farge);
            });
            const klasse = ["maned-dag", dato === idag && "idag", dato === valgtDag && "valgt", dato < idag && "forbi"].filter(Boolean).join(" ");
            const innhold = (
              <>
                <span className="maned-nr">{Number(dato.slice(8))}</span>
                <span className="maned-prikker">
                  {[...new Set(prikker)].slice(0, 4).map((farge) => (
                    <i key={farge} style={{ background: farge }} />
                  ))}
                </span>
              </>
            );
            const stil = i === 0 ? { gridColumnStart: forsteUkedag + 1 } : undefined;
            return dato < idag ? (
              <span key={dato} className={klasse} style={stil}>
                {innhold}
              </span>
            ) : (
              <Link
                key={dato}
                href={`/familiekalender?vis=maaned&m=${maned}&dag=${dato}`}
                className={klasse}
                style={stil}
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
                  <AvtaleRad key={f.avtale.id} f={f} personer={personer} over={valgtDag === idag && erOver(f, klokka)} />
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
  const linjer = oppsummering(uke, klokka, personer);

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
                      <AvtaleRad key={f.avtale.id} f={f} personer={personer} over />
                    ))}
                  </ul>
                </details>
              )}
              {erIdag && (
                <div className="naa" role="img" aria-label={`Nå, klokka ${klokka}`}>
                  <span>{klokka}</span>
                </div>
              )}
              {kommer.length > 0 ? (
                <ul className="avtaler">
                  {kommer.map((f) => (
                    <AvtaleRad key={f.avtale.id} f={f} personer={personer} />
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
        <Link href="/familiekalender?vis=maaned">Se hele måneden</Link>
      </nav>
    </Side>
  );
}
