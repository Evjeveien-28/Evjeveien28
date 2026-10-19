import Link from "next/link";
import { Card } from "@hjem/ui";
import { createClient } from "@hjem/db/server";
import { deler } from "../deler";
import { loggUt } from "./actions";

export default async function Hjem() {
  const supabase = await createClient();
  const { data: husstander } = await supabase.from("households").select("name");
  const husstand = husstander?.[0];

  return (
    <main>
      <h1>Tidsklemma</h1>
      {husstand ? (
        <p>{husstand.name}</p>
      ) : (
        <p>Du er ikke medlem av en husstand ennå.</p>
      )}

      {deler.length === 0 ? (
        <p style={{ color: "#555" }}>Ingen deler ennå.</p>
      ) : (
        deler.map((del) => (
          <Link key={del.slug} href={`/${del.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
            <Card title={del.navn}>
              <p style={{ margin: 0, color: "#555" }}>{del.beskrivelse}</p>
            </Card>
          </Link>
        ))
      )}

      <form action={loggUt}>
        <button type="submit" style={{ padding: 12, fontSize: 16 }}>
          Logg ut
        </button>
      </form>
    </main>
  );
}
