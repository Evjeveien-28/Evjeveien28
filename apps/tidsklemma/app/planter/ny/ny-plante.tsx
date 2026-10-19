"use client";

import { useEffect, useState } from "react";
import { Ikon } from "../../ikoner";
import { leggTil } from "../actions";
import type { Forslag } from "../gjenkjenn/route";
import { grupper, intervaller, sok, type Gruppe, type KatalogPlante } from "../katalog";
import { gjenkjenn, hentNyttBilde, krymp } from "./gjenkjenn";

const valgbareGrupper: Gruppe[] = ["torke", "middels", "fuktig"];

const feiltekster: Record<string, string> = {
  "ikke-satt-opp": "Bildegjenkjenning er ikke satt opp ennå. Søk på navn i stedet.",
  kvote: "Dagens kvote for bildegjenkjenning er brukt opp. Prøv igjen i morgen, eller søk på navn.",
  "for-stort": "Bildet er for stort. Prøv igjen.",
  "feil-format": "Bildet kunne ikke leses. Prøv et annet bilde.",
};

type Gjenkjent = { gjenkjent: Forslag };

/** Steg 1: ta bilde eller søk, og velg plante. Steg 2: kallenavn, plassering og sist vannet. */
export function NyPlante() {
  const [tekst, setTekst] = useState("");
  const [valgt, setValgt] = useState<KatalogPlante | Gjenkjent | "annen" | null>(null);
  const [bilde, setBilde] = useState<string | null>(null);
  const [leter, setLeter] = useState(false);
  const [forslag, setForslag] = useState<Forslag[] | null>(null);
  const [bildefeil, setBildefeil] = useState<string | null>(null);
  const [gruppe, setGruppe] = useState<Gruppe>("middels");
  const [sist, setSist] = useState("idag");
  const treff = sok(tekst).slice(0, 8);

  // Bilde tatt med «+» på plantelisten.
  useEffect(() => {
    hentNyttBilde().then((b) => b && finnPlante(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bare ved første visning
  }, []);

  async function velgBilde(fil: File | undefined) {
    if (fil) finnPlante(await krymp(fil));
  }

  async function finnPlante(blob: Blob) {
    setBilde(URL.createObjectURL(blob));
    setForslag(null);
    setBildefeil(null);
    setLeter(true);
    const svar = await gjenkjenn(blob);
    setLeter(false);
    if ("feil" in svar) setBildefeil(feiltekster[svar.feil] ?? "Det gikk ikke å gjenkjenne planten. Prøv igjen, eller søk på navn.");
    else setForslag(svar.forslag);
  }

  function velgForslag(f: Forslag) {
    if (f.treff.type === "art") setValgt(f.treff.plante);
    else {
      if (f.treff.type === "familie") setGruppe(f.treff.gruppe);
      setValgt({ gjenkjent: f });
    }
  }

  if (!valgt) {
    const kameraKnapp = (
      <label className={bilde ? "sekundar ta-bilde ta-nytt" : "primar ta-bilde"}>
        <Ikon navn="kamera" storrelse={bilde ? 18 : 22} />
        {bilde ? "Ta nytt bilde" : "Ta bilde av planten"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="visuelt-skjult"
          onChange={(e) => velgBilde(e.target.files?.[0])}
        />
      </label>
    );
    return (
      <>
        {!bilde && kameraKnapp}

        {bilde && (
          <div className="foto">
            {/* eslint-disable-next-line @next/next/no-img-element -- lokalt bilde fra kameraet */}
            <img src={bilde} alt="Bildet du tok" />
          </div>
        )}
        {leter && <p className="dempet" role="status">Leter etter planten …</p>}
        {bildefeil && <p className="feil">{bildefeil}</p>}
        {forslag && forslag.length === 0 && (
          <p className="dempet">Fant ingen plante i bildet. Prøv et nærbilde av bladene, eller søk på navn.</p>
        )}
        {forslag && forslag.length > 0 && (
          <>
            <p className="kt">Er det en av disse?</p>
            <ul className="forslag">
              {forslag.map((f) => (
                <li key={f.latin}>
                  <button type="button" className="forslag-knapp gjenkjent" onClick={() => velgForslag(f)}>
                    {f.bilde ? (
                      // eslint-disable-next-line @next/next/no-img-element -- eksempelbilde fra Pl@ntNet
                      <img src={f.bilde.url} alt="" className="forslag-bilde" />
                    ) : (
                      <span className="forslag-bilde" />
                    )}
                    <span className="ft">
                      <b>{f.treff.type === "art" ? f.treff.plante.navn : f.latin}</b>
                      <small>{f.treff.type === "art" ? f.latin : (f.vanligeNavn[0] ?? f.familie ?? "")}</small>
                      {f.bilde && <small className="kreditt">Foto: {f.bilde.kreditt}</small>}
                    </span>
                    <span className="sikker-kol">
                      <span className="sikker" aria-hidden="true">
                        <i style={{ width: `${f.sikkerhet}%` }} />
                      </span>
                      <span className="pst">{f.sikkerhet} %</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="kilde">Gjenkjenning: Pl@ntNet</p>
          </>
        )}

        <label htmlFor="sok" className="kt" style={{ marginTop: 18 }}>
          {forslag ? "Ikke blant forslagene? Skriv inn navnet" : bilde ? "Eller skriv inn navnet" : "Eller søk på navn"}
        </label>
        <input
          id="sok"
          className="felt"
          placeholder="F.eks. monstera, fredslilje, kaktus"
          autoComplete="off"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
        />
        {treff.length > 0 && (
          <ul className="forslag">
            {treff.map((p) => (
              <li key={p.id}>
                <button type="button" className="forslag-knapp" onClick={() => setValgt(p)}>
                  <span className="ft">
                    <b>{p.navn}</b>
                    <small>{p.latin}</small>
                  </span>
                  <span className="dempet liten">hver {intervaller(p).sommer}. dag</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {tekst.trim() && treff.length === 0 && <p className="dempet">Fant ingen planter som heter «{tekst.trim()}».</p>}
        <button type="button" className="lenke" onClick={() => setValgt("annen")}>
          Finner du den ikke? Legg til annen plante
        </button>
        {bilde && <div style={{ marginTop: 8 }}>{kameraKnapp}</div>}
      </>
    );
  }

  const gjenkjent = typeof valgt === "object" && "gjenkjent" in valgt ? valgt.gjenkjent : null;
  const lik = gjenkjent?.treff.type === "slekt" ? gjenkjent.treff.plante : null;
  const annen = valgt === "annen" || (gjenkjent !== null && !lik);
  const iv = lik ? intervaller(lik) : annen ? grupper[gruppe] : intervaller(valgt as KatalogPlante);

  return (
    <form action={leggTil}>
      {gjenkjent && <input type="hidden" name="latin" value={gjenkjent.latin} />}
      {lik ? (
        <>
          <input type="hidden" name="lik" value={lik.id} />
          <div className="kort">
            <p className="kt">{gjenkjent!.latin}</p>
            <p>
              Ikke i plantelisten, men i samme slekt som {lik.navn}. Vannes ca. <b>hver {iv.sommer}. dag</b> om sommeren og hver{" "}
              {iv.vinter}. om vinteren <span className="dempet">(anslått ut fra slekten)</span>.
            </p>
          </div>
          <label htmlFor="kallenavn" className="kt">
            Navn på planten
          </label>
          <input id="kallenavn" name="kallenavn" required maxLength={80} defaultValue={gjenkjent!.latin} className="felt" />
        </>
      ) : annen ? (
        <>
          {gjenkjent && (
            <div className="kort">
              <p className="kt">{gjenkjent.latin}</p>
              <p>
                {gjenkjent.treff.type === "familie"
                  ? `Ikke i plantelisten. Typen er anslått ut fra familien (${gjenkjent.familie}). Endre hvis den ikke stemmer.`
                  : "Ikke i plantelisten, og ingen lignende planter. Velg hvordan planten er."}
              </p>
            </div>
          )}
          <label htmlFor="kallenavn" className="kt">
            Navn på planten
          </label>
          <input
            id="kallenavn"
            name="kallenavn"
            required
            maxLength={80}
            defaultValue={gjenkjent ? gjenkjent.latin : tekst.trim().charAt(0).toUpperCase() + tekst.trim().slice(1)}
            className="felt"
          />
          <p className="kt">Hvordan er planten?</p>
          <div className="knapperad" role="radiogroup" aria-label="Type plante">
            {valgbareGrupper.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={gruppe === g}
                className={gruppe === g ? "sekundar valgt" : "sekundar"}
                onClick={() => setGruppe(g)}
              >
                {grupper[g].navn}
              </button>
            ))}
          </div>
          <input type="hidden" name="gruppe" value={gruppe} />
          <p className="dempet liten">
            Vannes ca. hver {iv.sommer}. dag om sommeren og hver {iv.vinter}. om vinteren.
          </p>
          <label htmlFor="dager" className="kt">
            Eller: vannes hver … dag <span className="valgfritt">(valgfritt)</span>
          </label>
          <input
            id="dager"
            name="dager"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            placeholder="Antall dager"
            className="felt"
          />
          <p className="dempet liten">Setter du egne dager, brukes de alltid, og appen prøver ikke å lære et annet intervall.</p>
        </>
      ) : (
        <>
          <input type="hidden" name="katalog" value={(valgt as KatalogPlante).id} />
          <div className="kort">
            <p className="kt">{(valgt as KatalogPlante).navn}</p>
            <p>
              Vannes ca. <b>hver {iv.sommer}. dag</b> om sommeren og hver {iv.vinter}. om vinteren.
            </p>
            <p className="dempet liten">{iv.tips}</p>
          </div>
          <label htmlFor="kallenavn" className="kt">
            Kallenavn <span className="valgfritt">(valgfritt)</span>
          </label>
          <input id="kallenavn" name="kallenavn" maxLength={80} placeholder={`F.eks. «${(valgt as KatalogPlante).navn} i stua»`} className="felt" />
        </>
      )}

      <label htmlFor="plassering" className="kt">
        Plassering <span className="valgfritt">(valgfritt)</span>
      </label>
      <input id="plassering" name="plassering" maxLength={80} placeholder="F.eks. stua, ved vinduet" className="felt" />

      <p className="kt">Når ble den vannet sist?</p>
      <div className="knapperad" role="radiogroup" aria-label="Sist vannet">
        {[
          ["idag", "I dag"],
          ["igaar", "I går"],
          ["vetikke", "Vet ikke"],
        ].map(([verdi, tekst]) => (
          <button
            key={verdi}
            type="button"
            role="radio"
            aria-checked={sist === verdi}
            className={sist === verdi ? "sekundar valgt" : "sekundar"}
            onClick={() => setSist(verdi!)}
          >
            {tekst}
          </button>
        ))}
      </div>
      <input type="hidden" name="sist" value={sist} />

      <button type="submit" className="primar" style={{ marginTop: 20 }}>
        Legg til plante
      </button>
      <button type="button" className="lenke" onClick={() => setValgt(null)}>
        Velg en annen plante
      </button>
    </form>
  );
}
