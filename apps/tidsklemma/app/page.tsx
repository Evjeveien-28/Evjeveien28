import Link from "next/link";
import { createClient } from "@hjem/db/server";
import { hentPlanter } from "./planter/data";
import { deler } from "../deler";
import { loggUt } from "./actions";
import { Ikon } from "./ikoner";
import { PasskeyForslag } from "./passkey-forslag";
import { Topp } from "./skilt";

const farger = ["brun", "blaa", "gronn", "krem"] as const;

function hilsen() {
  const time = Number(new Intl.DateTimeFormat("nb-NO", { hour: "numeric", timeZone: "Europe/Oslo" }).format(new Date()));
  if (time < 5) return "God natt";
  if (time < 10) return "God morgen";
  if (time < 18) return "God dag";
  return "God kveld";
}

export default async function Hjem() {
  const supabase = await createClient();
  const { data: husstander } = await supabase.from("households").select("id, name");
  const husstand = husstander?.[0];

  // Levende tekst og rød prikk på flisene som har noe å melde.
  const status: Record<string, { tekst: string; antall: number }> = {};
  if (husstand) {
    const planter = await hentPlanter(supabase, husstand.id).catch(() => null);
    if (planter) {
      const antall = planter.filter((p) => p.trengerVann).length;
      status.planter = {
        antall,
        tekst: planter.length === 0 ? "Legg til planter" : antall > 0 ? `${antall} trenger vann` : "Alt er vannet",
      };
    }
  }

  return (
    <>
      <Topp />
      <p className="hilsen">
        {hilsen()}
        {husstand && <span className="dempet"> · {husstand.name}</span>}
      </p>
      {!husstand && <p>Du er ikke medlem av en husstand ennå.</p>}

      <PasskeyForslag />

      {deler.length === 0 ? (
        <div className="kort stiplet">
          <p className="kt">Ingen deler ennå</p>
          <p>Her kommer middag, handleliste og det andre vi lager.</p>
        </div>
      ) : (
        <div className="rutenett">
          {deler.map((del, i) => (
            <Link key={del.slug} href={`/${del.slug}`} className={`flis flis-${del.farge ?? farger[i % farger.length]}`}>
              <span className="ikon">
                <Ikon navn={del.ikon} storrelse={30} />
              </span>
              {status[del.slug]?.antall ? (
                <span className="merke-rod" aria-label={`${status[del.slug]!.antall} trenger oppmerksomhet`}>
                  {status[del.slug]!.antall}
                </span>
              ) : null}
              <b>{del.navn}</b>
              <small>{status[del.slug]?.tekst ?? del.beskrivelse}</small>
            </Link>
          ))}
        </div>
      )}

      <nav className="bunnmeny" aria-label="Meny">
        <Link href="/husstand">Husstand</Link>
        <span aria-hidden="true">·</span>
        <Link href="/innlogging">Innlogging</Link>
        <span aria-hidden="true">·</span>
        <form action={loggUt}>
          <button type="submit">Logg ut</button>
        </form>
      </nav>
    </>
  );
}
