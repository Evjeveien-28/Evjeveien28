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

  if (!husstand) {
    return (
      <main>
        <p>
          <Link href="/">← Tilbake</Link>
        </p>
        <h1>Husstand</h1>
        <p>Du er ikke medlem av en husstand ennå.</p>
      </main>
    );
  }

  const [{ data: medlemmer }, { data: invitasjoner }, { data: meg }] = await Promise.all([
    supabase.rpc("husstandens_medlemmer", { hid: husstand.id }),
    supabase.from("household_invitations").select("email").eq("household_id", husstand.id).order("created_at"),
    supabase.auth.getClaims(),
  ]);
  const minId = meg?.claims.sub;

  return (
    <main>
      <p>
        <Link href="/">← Tilbake</Link>
      </p>
      <h1>{husstand.name}</h1>

      <h2 style={{ fontSize: 18 }}>Medlemmer</h2>
      <ul style={{ paddingLeft: 20 }}>
        {(medlemmer as { user_id: string; email: string }[] | null)?.map((m) => (
          <li key={m.user_id}>
            {m.email}
            {m.user_id === minId && " (deg)"}
          </li>
        ))}
      </ul>

      {invitert && (
        <Card title="Invitasjon lagt inn">
          <p style={{ marginTop: 0 }}>
            Be {invitert} gå til Tidsklemma og logge inn med e-posten sin. Da blir de med i husstanden.
          </p>
          <DelInvitasjon email={invitert} />
        </Card>
      )}
      {lagtTil && (
        <Card title="Lagt til">
          <p style={{ margin: 0 }}>{lagtTil} hadde allerede en bruker og er nå med i husstanden.</p>
        </Card>
      )}

      {invitasjoner && invitasjoner.length > 0 && (
        <>
          <h2 style={{ fontSize: 18 }}>Venter på innlogging</h2>
          {invitasjoner.map((i: { email: string }) => (
            <div key={i.email} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ flex: "1 1 200px" }}>{i.email}</span>
              <DelInvitasjon email={i.email} />
              <form action={trekkTilbake}>
                <input type="hidden" name="husstand" value={husstand.id} />
                <input type="hidden" name="email" value={i.email} />
                <button type="submit" style={{ padding: 12, fontSize: 16 }}>
                  Trekk tilbake
                </button>
              </form>
            </div>
          ))}
        </>
      )}

      <h2 style={{ fontSize: 18 }}>Inviter noen</h2>
      <form action={inviter} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="hidden" name="husstand" value={husstand.id} />
        <label htmlFor="email">E-post</label>
        <input id="email" name="email" type="email" required autoComplete="off" style={{ padding: 12, fontSize: 16 }} />
        <button type="submit" style={{ padding: 12, fontSize: 16 }}>
          Inviter
        </button>
        {feil && <p style={{ color: "#b91c1c" }}>Det gikk ikke å invitere. Sjekk adressen og prøv igjen.</p>}
      </form>
    </main>
  );
}
