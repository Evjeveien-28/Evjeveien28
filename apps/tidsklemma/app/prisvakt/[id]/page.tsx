import { createClient } from "@hjem/db/server";
import { notFound } from "next/navigation";
import { leggTilDager, iDag } from "../../dato";
import { Side } from "../../side";
import { settOnsket, sjekkNa, slutt } from "../actions";
import { kr, trend, underOnsket, VAREFELT, type Vare } from "../data";
import { Varebilde } from "../varebilde";
import { Graf } from "./graf";
import { SluttKnapp } from "./slutt-knapp";

const dato = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });
const tid = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long", hour: "2-digit", minute: "2-digit" });

export default async function VareSide({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lagt?: string; feil?: string }> }) {
  const [{ id }, { lagt, feil }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const db = supabase.schema("prisvakt");
  const fra = leggTilDager(iDag(), -90);
  const [{ data }, { data: priser }] = await Promise.all([
    db.from("varer").select(VAREFELT).eq("id", id).maybeSingle(),
    db.from("priser").select("dato, pris").eq("vare_id", id).gte("dato", fra).order("dato"),
  ]);
  if (!data) notFound();
  const v = { ...(data as Vare), pris: Number(data.pris), startpris: Number(data.startpris), onsket_pris: data.onsket_pris == null ? null : Number(data.onsket_pris) };
  const historikk = ((priser ?? []) as { dato: string; pris: number }[]).map((p) => ({ dato: p.dato, pris: Number(p.pris) }));
  const t = trend(v);
  const laveste = historikk.reduce((min, p) => (p.pris < min.pris ? p : min), historikk[0] ?? { dato: iDag(), pris: v.pris });

  return (
    <Side tilbake={{ href: "/prisvakt", navn: "Prisvakt" }}>
      {lagt && <p className="dempet">Lagt til. Prisen sjekkes hver morgen.</p>}
      <div className="forhand">
        <Varebilde vare={v} stor />
        <span className="pt">
          <b className="vnavn">{v.navn}</b>
          <small>
            {v.butikk}
            {v.pa_lager === true && " · på lager"}
            {v.pa_lager === false && " · ikke på lager"}
          </small>
        </span>
      </div>
      <div className="stor-pris">
        <b>{kr(v.pris)}</b>
        <span className={`trend ${t.klasse}`}>
          {t.tekst}
          {t.klasse !== "stabil" && ` siden ${dato.format(new Date(`${v.created_at.slice(0, 10)}T12:00:00Z`))}`}
        </span>
        {underOnsket(v) && <span className="trend under">Under ønsket</span>}
      </div>
      {v.feil && <p className="feil liten">{v.feil}</p>}

      {historikk.length > 1 ? (
        <>
          <Graf priser={historikk} onsket={v.onsket_pris} />
          <p className="dempet liten" style={{ margin: "0 0 14px" }}>
            Siste {historikk.length} dager med pris. Laveste: {kr(laveste.pris)} ({dato.format(new Date(`${laveste.dato}T12:00:00Z`))}).
          </p>
        </>
      ) : (
        <p className="dempet liten">Grafen kommer når prisen er sjekket noen dager.</p>
      )}

      <div className="kort">
        <p className="kt">Si fra når</p>
        <p style={{ margin: "2px 0 8px" }}>
          {v.onsket_pris != null ? (
            <>
              Prisen faller, eller er under <b>{kr(v.onsket_pris)}</b>
            </>
          ) : (
            "Prisen faller"
          )}
        </p>
        <form action={settOnsket} className="tid-rad">
          <input type="hidden" name="vare" value={v.id} />
          <label htmlFor="onsket" className="visuelt-skjult">
            Ønsket pris i kroner
          </label>
          <input id="onsket" name="onsket" inputMode="decimal" defaultValue={v.onsket_pris ?? ""} placeholder="Ønsket pris, f.eks. 1500" className="felt" />
          <button type="submit" className="inline-knapp">
            Lagre
          </button>
        </form>
        {feil === "belop" && <p className="feil liten">Skriv ønsket pris som et tall, f.eks. 1500.</p>}
      </div>

      {v.ean && (
        <div className="kort">
          <p className="kt">Andre butikker</p>
          <p style={{ margin: "2px 0 6px" }}>Se hva den koster andre steder, med strekkoden {v.ean}.</p>
          <a href={`https://www.prisjakt.no/search?search=${v.ean}`} target="_blank" rel="noreferrer" className="inline-knapp">
            Søk på Prisjakt ›
          </a>
        </div>
      )}

      <div className="bunnknapper">
        <a href={v.url} target="_blank" rel="noreferrer" className="primar">
          Åpne hos {v.butikk}
        </a>
        <form action={sjekkNa}>
          <input type="hidden" name="vare" value={v.id} />
          <button type="submit" className="lenke">
            Sjekk prisen nå
          </button>
        </form>
        <p className="dempet liten" style={{ textAlign: "center", margin: 0 }}>
          Sist sjekket {tid.format(new Date(v.sist_sjekket))}
        </p>
        <form action={slutt}>
          <input type="hidden" name="vare" value={v.id} />
          <SluttKnapp navn={v.navn} />
        </form>
      </div>
    </Side>
  );
}
