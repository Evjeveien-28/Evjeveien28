const tekster: Record<string, string> = {
  tittel: "Skriv hva avtalen gjelder.",
  hvem: "Velg hvem som skal være med.",
  dato: "Sjekk datoene. Sluttdatoen kan ikke være før startdatoen.",
  tid: "Sjekk klokkeslettene. «Til» kan ikke være før «Fra».",
  gjentas: "Datoen gjentakelsen slutter kan ikke være før avtalen starter.",
  lagre: "Det gikk ikke å lagre. Prøv igjen.",
  avlys: "Det gikk ikke å avlyse. Prøv igjen.",
};

export function Feilmelding({ feil }: { feil?: string }) {
  if (!feil) return null;
  return <p className="feil">{tekster[feil] ?? tekster.lagre}</p>;
}
