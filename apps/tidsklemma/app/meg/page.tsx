import Link from "next/link";
import { Side } from "../side";
import { Card } from "@hjem/ui";
import { loggUt } from "../actions";
import { hentBruker } from "./bruker";
import { lagreFornavn } from "./actions";

export default async function Meg({ searchParams }: { searchParams: Promise<{ lagret?: string; feil?: string }> }) {
  const [{ lagret, feil }, bruker] = await Promise.all([searchParams, hentBruker()]);

  return (
    <Side tittel={bruker?.fornavn ?? "Meg"} tilbake={{ href: "/", navn: "Tilbake" }}>
      <form action={lagreFornavn} style={{ marginBottom: 20 }}>
        <label htmlFor="fornavn" className="kt">
          Fornavn
        </label>
        <input
          id="fornavn"
          name="fornavn"
          required
          maxLength={40}
          autoComplete="given-name"
          defaultValue={bruker?.fornavn ?? ""}
          className="felt"
        />
        {feil && <p className="feil">Det gikk ikke å lagre navnet. Prøv igjen.</p>}
        {lagret && <p className="dempet">Lagret.</p>}
        <button type="submit" className="sekundar">
          Lagre navn
        </button>
      </form>

      <Card title="E-post">
        <p>{bruker?.email}</p>
      </Card>

      <nav className="meg-meny" aria-label="Meg">
        <Link href="/husstand" className="meg-lenke">
          Husstand <span aria-hidden="true">›</span>
        </Link>
        <Link href="/meg/varsler" className="meg-lenke">
          Varsler <span aria-hidden="true">›</span>
        </Link>
        <Link href="/innlogging" className="meg-lenke">
          Innlogging og passkeys <span aria-hidden="true">›</span>
        </Link>
      </nav>

      <form action={loggUt} className="bunnknapper">
        <button type="submit" className="sekundar">
          Logg ut
        </button>
      </form>
    </Side>
  );
}
