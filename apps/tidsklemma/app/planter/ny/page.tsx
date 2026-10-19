import Link from "next/link";
import { NyPlante } from "./ny-plante";

export default async function Ny({ searchParams }: { searchParams: Promise<{ feil?: string }> }) {
  const { feil } = await searchParams;
  return (
    <>
      <Link href="/planter" className="tilbake">
        ← Avbryt
      </Link>
      <h2>Ny plante</h2>
      <div className="strek venstre" />
      {feil === "navn" && <p className="feil">Gi planten et navn.</p>}
      {feil === "lagre" && <p className="feil">Det gikk ikke å lagre. Prøv igjen.</p>}
      <NyPlante />
    </>
  );
}
