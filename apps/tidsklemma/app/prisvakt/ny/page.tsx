import { Side } from "../../side";
import { leggTil } from "../actions";
import { HentKnapp } from "./hent-knapp";

const feiltekst: Record<string, string> = {
  lenke: "Det ser ikke ut som en lenke. Kopier adressen fra nettbutikken og lim den inn.",
  belop: "Skriv ønsket pris som et tall, f.eks. 1500.",
  lagre: "Det gikk ikke å lagre. Prøv igjen.",
};

export default async function NyVare({ searchParams }: { searchParams: Promise<{ feil?: string; url?: string; melding?: string }> }) {
  const { feil, url, melding } = await searchParams;
  return (
    <Side tittel="Følg en pris" tilbake={{ href: "/prisvakt", navn: "Prisvakt" }}>
      {feil && <p className="feil">{feil === "henting" ? (melding ?? "Fant ikke prisen.") : feiltekst[feil]}</p>}
      <form action={leggTil}>
        <label htmlFor="url" className="kt">
          Lenke til varen
        </label>
        <input id="url" name="url" type="url" inputMode="url" required defaultValue={url} placeholder="https://www.obsbygg.no/…" className="felt" autoFocus />
        <label htmlFor="onsket" className="kt">
          Si fra under <span className="valgfritt">(valgfritt)</span>
        </label>
        <input id="onsket" name="onsket" inputMode="decimal" placeholder="F.eks. 1500" className="felt" autoComplete="off" />
        <p className="dempet liten" style={{ marginTop: -4 }}>
          Uten ønsket pris får du varsel hver gang prisen faller.
        </p>
        <HentKnapp />
      </form>
      <p className="dempet liten" style={{ textAlign: "center", marginTop: 14 }}>
        Virker med nettbutikker som viser prisen i sidedataene, f.eks. Obs Bygg. Prisen sjekkes hver morgen.
      </p>
    </Side>
  );
}
