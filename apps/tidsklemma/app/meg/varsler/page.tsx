import { createClient } from "@hjem/db/server";
import { Side } from "../../side";
import { pushKlar } from "../../push/send";
import { lagreInnstilling } from "./actions";
import { PushEnhet } from "./enhet";

const TIDER = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const min = 6 * 60 + i * 15;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

function Bryter({ felt, pa, tekst, under }: { felt: string; pa: boolean; tekst: string; under: string }) {
  return (
    <form action={lagreInnstilling} className="bryter-skjema">
      <input type="hidden" name="felt" value={felt} />
      <input type="hidden" name="pa" value={pa ? "0" : "1"} />
      <button type="submit" role="switch" aria-checked={pa} className="bryter">
        <span className="bryter-tekst">
          {tekst}
          <small className="dempet liten" style={{ display: "block" }}>
            {under}
          </small>
        </span>
        <span className="bryter-spor" aria-hidden="true">
          <span className="bryter-knott" />
        </span>
      </button>
    </form>
  );
}

export default async function Varsler() {
  const supabase = await createClient();
  const { data } = await supabase.from("push_innstillinger").select("kalender, planter, planter_tid, prisvakt").maybeSingle();
  const inn = { kalender: data?.kalender ?? true, planter: data?.planter ?? false, tid: (data?.planter_tid ?? "08:00").slice(0, 5), prisvakt: data?.prisvakt ?? true };

  return (
    <Side tittel="Varsler" tilbake={{ href: "/meg", navn: "Meg" }}>
      {!pushKlar() ? (
        <div className="kort stiplet">
          <p className="kt">Ikke satt opp ennå</p>
          <p>Nøklene for push mangler i Vercel. Se README under «Push-varsler».</p>
        </div>
      ) : (
        <div className="kort">
          <p className="kt">Denne enheten</p>
          <PushEnhet offentligNokkel={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!} />
        </div>
      )}

      <div className="kort">
        <p className="kt">Varsle meg om</p>
        <Bryter felt="kalender" pa={inn.kalender} tekst="Familiekalender" under="Når noen legger inn, endrer eller avlyser en avtale" />
        <Bryter felt="prisvakt" pa={inn.prisvakt} tekst="Prisvakt" under="Når en vare dere følger blir billigere" />
        <Bryter felt="planter" pa={inn.planter} tekst="Planter" under="Én gang om dagen, hvis noe trenger vann" />
        {inn.planter && (
          <form action={lagreInnstilling} className="tid-rad">
            <input type="hidden" name="felt" value="planter_tid" />
            <label htmlFor="tid" className="dempet">
              Klokka
            </label>
            <select id="tid" name="tid" defaultValue={inn.tid} className="felt">
              {TIDER.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button type="submit" className="inline-knapp">
              Lagre
            </button>
          </form>
        )}
      </div>
      <p className="dempet liten">Valgene gjelder alle enhetene dine. Hver telefon må slå på varsler for seg.</p>
    </Side>
  );
}
