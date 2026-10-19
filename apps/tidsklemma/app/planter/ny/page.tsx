import { Side } from "../../side";
import { NyPlante } from "./ny-plante";

export default async function Ny({ searchParams }: { searchParams: Promise<{ feil?: string }> }) {
  const { feil } = await searchParams;
  return (
    <Side tittel="Ny plante" tilbake={{ href: "/planter", navn: "Planter" }}>
      {feil === "navn" && <p className="feil">Gi planten et navn.</p>}
      {feil === "lagre" && <p className="feil">Det gikk ikke å lagre. Prøv igjen.</p>}
      {feil === "dager" && <p className="feil">Antall dager må være mellom 1 og 120.</p>}
      <NyPlante />
    </Side>
  );
}
