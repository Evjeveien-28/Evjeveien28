"use client";

import { useState } from "react";
import { leggTil } from "../actions";
import { grupper, intervaller, sok, type Gruppe, type KatalogPlante } from "../katalog";

const valgbareGrupper: Gruppe[] = ["torke", "middels", "fuktig"];

/** Steg 1: søk og velg plante (eller «annen plante»). Steg 2: kallenavn, plassering og sist vannet. */
export function NyPlante() {
  const [tekst, setTekst] = useState("");
  const [valgt, setValgt] = useState<KatalogPlante | "annen" | null>(null);
  const [gruppe, setGruppe] = useState<Gruppe>("middels");
  const [sist, setSist] = useState("idag");
  const treff = sok(tekst).slice(0, 8);

  if (!valgt) {
    return (
      <>
        <label htmlFor="sok" className="kt">
          Hva slags plante er det?
        </label>
        <input
          id="sok"
          className="felt"
          placeholder="F.eks. monstera, fredslilje, kaktus"
          autoComplete="off"
          autoFocus
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
      </>
    );
  }

  const annen = valgt === "annen";
  const iv = annen ? grupper[gruppe] : intervaller(valgt);

  return (
    <form action={leggTil}>
      {annen ? (
        <>
          <label htmlFor="kallenavn" className="kt">
            Navn på planten
          </label>
          <input id="kallenavn" name="kallenavn" required maxLength={80} defaultValue={tekst.trim().charAt(0).toUpperCase() + tekst.trim().slice(1)} className="felt" />
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
            placeholder="F.eks. 1 for et juletre"
            className="felt"
          />
          <p className="dempet liten">Setter du egne dager, brukes de alltid, og appen prøver ikke å lære et annet intervall.</p>
        </>
      ) : (
        <>
          <input type="hidden" name="katalog" value={valgt.id} />
          <div className="kort">
            <p className="kt">{valgt.navn}</p>
            <p>
              Vannes ca. <b>hver {iv.sommer}. dag</b> om sommeren og hver {iv.vinter}. om vinteren.
            </p>
            <p className="dempet liten">{iv.tips}</p>
          </div>
          <label htmlFor="kallenavn" className="kt">
            Kallenavn <span className="valgfritt">(valgfritt)</span>
          </label>
          <input id="kallenavn" name="kallenavn" maxLength={80} placeholder={`F.eks. «${valgt.navn} i stua»`} className="felt" />
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
