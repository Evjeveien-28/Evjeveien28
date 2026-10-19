import Link from "next/link";
import { Card } from "@hjem/ui";
import { createClient } from "@hjem/db/server";
import { inviter, trekkTilbake } from "./actions";
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

  const tilbake = (
    <Link href="/meg" className="tilbake">
      ← Meg
    </Link>
  );

  if (!husstand) {
    return (
      <>
        {tilbake}
        <h2>Husstanden</h2>
        <div className="strek venstre" />
        <p>Du er ikke medlem av en husstand ennå.</p>
      </>
    );
  }

  const [{ data: medlemmer }, { data: invitasjoner }, { data: meg }] = await Promise.all([
    supabase.rpc("husstandens_medlemmer", { hid: husstand.id }),
    supabase.from("household_invitations").select("email").eq("household_id", husstand.id).order("created_at"),
    supabase.auth.getClaims(),
  ]);
  const minId = meg?.claims.sub;

  return (
    <>
      {tilbake}
      <h2>{husstand.name}</h2>
      <div className="strek venstre" />

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

      <Card title="Medlemmer">
        <ul className="liste">
          {(medlemmer as { user_id: string; email: string; fornavn?: string | null }[] | null)?.map((m) => (
            <li key={m.user_id}>
              <span>
                {m.fornavn ? (
                  <>
                    <b>{m.fornavn}</b> <span className="dempet liten">{m.email}</span>
                  </>
                ) : (
                  m.email
                )}
                {m.user_id === minId && <em className="dempet"> (deg)</em>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

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
        {feil && <p className="feil">Det gikk ikke å invitere. Sjekk adressen og prøv igjen.</p>}
      </form>
    </>
  );
}
