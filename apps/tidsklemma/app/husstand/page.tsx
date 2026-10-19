import { Card } from "@hjem/ui";
import { createClient } from "@hjem/db/server";
import Link from "next/link";
import { inviter, leggTilPerson, trekkTilbake } from "./actions";
import { DatabaseFeil } from "../database-feil";
import { hentPersoner, type Person } from "./personer";
import { Side } from "../side";
import { DelInvitasjon } from "./del-invitasjon";

export default async function Husstand({
  searchParams,
}: {
  searchParams: Promise<{ invitert?: string; "lagt-til"?: string; feil?: string }>;
}) {
  const { invitert, "lagt-til": lagtTil, feil } = await searchParams;
  const supabase = await createClient();
  const { data: husstander } = await supabase.from("households").select("id, name");
  const husstand = husstander?.[0];

  const tilbake = { href: "/meg", navn: "Meg" };

  if (!husstand) {
    return (
      <Side tittel="Husstanden" tilbake={tilbake}>
        <p>Du er ikke medlem av en husstand ennå.</p>
      </Side>
    );
  }

  const [{ data: medlemmer }, { data: invitasjoner }, { data: meg }, personer] = await Promise.all([
    supabase.rpc("husstandens_medlemmer", { hid: husstand.id }),
    supabase.from("household_invitations").select("email").eq("household_id", husstand.id).order("created_at"),
    supabase.auth.getClaims(),
    hentPersoner(supabase, husstand.id).catch((e: Error) => e),
  ]);
  const minId = meg?.claims.sub;
  const epost = new Map((medlemmer as { user_id: string; email: string }[] | null)?.map((m) => [m.user_id, m.email]));

  return (
    <Side tittel={husstand.name} tilbake={tilbake}>
      {invitert && (
        <Card title="Invitasjon lagt inn">
          <p>Be {invitert} gå til Tidsklemma og logge inn med e-posten sin. Da blir de med i husstanden.</p>
          <DelInvitasjon email={invitert} />
        </Card>
      )}
      {lagtTil && (
        <Card title="Lagt til">
          <p>{lagtTil} hadde allerede en bruker og er nå med i husstanden.</p>
        </Card>
      )}

      {personer instanceof Error ? (
        <DatabaseFeil melding={personer.message} hva="personene" schema="public" tabeller="tabellen household_people" />
      ) : (
        <Card title="Personer">
          <ul className="personliste">
            {personer.map((p: Person) => (
              <li key={p.id}>
                <Link href={`/husstand/person/${p.id}`} className="person-lenke">
                  <span className="fargeprikk" style={{ background: p.farge }} aria-hidden="true" />
                  <span className="pt">
                    <b>
                      {p.navn}
                      {p.user_id && p.user_id === minId && <em className="dempet"> (deg)</em>}
                    </b>
                    <small>{p.user_id ? (epost.get(p.user_id) ?? "Har app") : "Uten app"}</small>
                  </span>
                  <span className="pil" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
          <form action={leggTilPerson} className="legg-til-person">
            <input type="hidden" name="husstand" value={husstand.id} />
            <label htmlFor="person-navn" className="visuelt-skjult">
              Navn
            </label>
            <input id="person-navn" name="navn" required maxLength={40} autoComplete="off" placeholder="Navn" className="felt" />
            <button type="submit" className="inline-knapp">
              Legg til uten app
            </button>
          </form>
          {feil === "person" && <p className="feil">Det gikk ikke å legge til. Prøv igjen.</p>}
        </Card>
      )}

      {invitasjoner && invitasjoner.length > 0 && (
        <Card title="Venter på innlogging" stiplet>
          <ul className="liste">
            {invitasjoner.map((i: { email: string }) => (
              <li key={i.email} className="ventende">
                <span>{i.email}</span>
                <div className="knapperad">
                  <DelInvitasjon email={i.email} />
                  <form action={trekkTilbake}>
                    <input type="hidden" name="husstand" value={husstand.id} />
                    <input type="hidden" name="email" value={i.email} />
                    <button type="submit" className="sekundar">
                      Trekk tilbake
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <form action={inviter}>
        <input type="hidden" name="husstand" value={husstand.id} />
        <label htmlFor="email" className="kt">
          Inviter noen
        </label>
        <input id="email" name="email" type="email" required autoComplete="off" placeholder="E-post" className="felt" />
        <button type="submit" className="primar">
          Inviter
        </button>
        {feil === "1" && <p className="feil">Det gikk ikke å invitere. Sjekk adressen og prøv igjen.</p>}
      </form>
    </Side>
  );
}
