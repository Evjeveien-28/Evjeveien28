import Link from "next/link";
import { createClient } from "@hjem/db/server";
import { notFound } from "next/navigation";
import { hentPersoner } from "../../husstand/personer";
import { Side } from "../../side";
import { avlys } from "../actions";
import { Hvem } from "../avtalerad";
import { AVTALEFELT, tilAvtale, type AvtaleRad } from "../data";
import { Feilmelding } from "../feil";
import { dagTekst, iDag, kl, leggTilDager, relativDag } from "../tid";
import { AvlysKnapp } from "./avlys-knapp";

export default async function AvtaleSide({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string }>;
}) {
  const [{ id }, { feil }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.schema("kalender").from("avtaler").select(AVTALEFELT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const a = tilAvtale(data as AvtaleRad);
  const personer = await hentPersoner(supabase, a.household_id);
  const laget = personer.find((p) => p.user_id && p.user_id === a.created_by)?.navn;
  const idag = iDag();

  const dag = (d: string) => (d <= leggTilDager(idag, 1) ? `${relativDag(d, idag)}, ${dagTekst(d)}` : dagTekst(d));
  const tid = a.start_tid ? `kl. ${kl(a.start_tid)}${a.slutt_tid ? `–${kl(a.slutt_tid)}` : ""}` : "Hele dagen";

  return (
    <Side tittel={a.tittel} tilbake={{ href: "/familiekalender", navn: "Familiekalender" }}>
      <Feilmelding feil={feil} />
      {a.avlyst_at && <p className="feil">Avlyst</p>}
      <dl className="detaljer">
        <dt className="kt">Når</dt>
        <dd>
          {a.slutt_dato > a.start_dato ? (
            <>
              {dag(a.start_dato)}
              {a.start_tid && ` kl. ${kl(a.start_tid)}`} – {dag(a.slutt_dato)}
              {a.slutt_tid && ` kl. ${kl(a.slutt_tid)}`}
            </>
          ) : (
            <>
              {dag(a.start_dato)} · {tid}
            </>
          )}
        </dd>
        {a.sted && (
          <>
            <dt className="kt">Hvor</dt>
            <dd>{a.sted}</dd>
          </>
        )}
        <dt className="kt">Hvem</dt>
        <dd>
          <Hvem personer={a.personer} alle={personer} />
        </dd>
      </dl>
      {laget && <p className="dempet liten">Lagt inn av {laget}</p>}

      {!a.avlyst_at && (
        <>
          <Link href={`/familiekalender/${a.id}/endre`} className="primar" style={{ marginTop: 16 }}>
            Endre
          </Link>
          <form action={avlys} className="bunnknapper">
            <input type="hidden" name="avtale" value={a.id} />
            <AvlysKnapp tittel={a.tittel} />
          </form>
        </>
      )}
    </Side>
  );
}

