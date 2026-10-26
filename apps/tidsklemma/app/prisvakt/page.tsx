import Link from "next/link";
import { createClient } from "@hjem/db/server";
import { DatabaseFeil } from "../database-feil";
import { hentHusstand } from "../planter/data";
import { Side } from "../side";
import { hentVarer, kr, trend, underOnsket, type Vare } from "./data";
import { Varebilde } from "./varebilde";

const tilbake = { href: "/", navn: "Tilbake" };
const tid = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long", hour: "2-digit", minute: "2-digit" });

export default async function Prisvakt() {
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  const pluss = (
    <Link href="/prisvakt/ny" className="pluss" aria-label="Følg en ny pris">
      +
    </Link>
  );
  if (!husstand) {
    return (
      <Side tittel="Prisvakt" tilbake={tilbake}>
        <p>Du er ikke medlem av en husstand ennå.</p>
      </Side>
    );
  }

  let varer: Vare[];
  try {
    varer = await hentVarer(supabase, husstand.id);
  } catch (e) {
    return (
      <Side tittel="Prisvakt" tilbake={tilbake}>
        <DatabaseFeil melding={e instanceof Error ? e.message : String(e)} hva="varene" schema="prisvakt" tabeller="prisvakt-tabellene" />
      </Side>
    );
  }
  const sist = varer.map((v) => v.sist_sjekket).sort().at(-1);

  return (
    <Side tittel="Prisvakt" tilbake={tilbake} handling={pluss}>
      {varer.length === 0 ? (
        <div className="kort stiplet">
          <p className="kt">Ingen varer ennå</p>
          <p>Trykk «+» og lim inn lenken til en vare i en nettbutikk. Du får beskjed når prisen faller.</p>
        </div>
      ) : (
        <ul className="vliste">
          {varer.map((v) => {
            const t = trend(v);
            return (
              <li key={v.id}>
                <Link href={`/prisvakt/${v.id}`} className="vare">
                  <Varebilde vare={v} />
                  <span className="pt">
                    <b>{v.navn}</b>
                    <small>
                      {v.butikk}
                      {v.onsket_pris != null && ` · ønsket pris ${kr(v.onsket_pris)}`}
                    </small>
                    {v.feil && <small className="feil">{v.feil}</small>}
                  </span>
                  <span className="vpris">
                    <b>{kr(v.pris)}</b>
                    <span className={`trend ${t.klasse}`}>{t.tekst}</span>
                    {underOnsket(v) && <span className="trend under">Under ønsket</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {sist && <p className="dempet liten" style={{ textAlign: "center", marginTop: 14 }}>Sist sjekket {tid.format(new Date(sist))}</p>}
    </Side>
  );
}
