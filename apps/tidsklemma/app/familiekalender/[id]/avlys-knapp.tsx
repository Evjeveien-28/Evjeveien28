"use client";

import { useState } from "react";

/** Avlys. For en serie velger man om det gjelder bare denne gangen, denne og fremover, eller alle. */
export function AvlysKnapp({ tittel, serie }: { tittel: string; serie: boolean }) {
  const [velg, setVelg] = useState(false);

  if (!serie) {
    return (
      <button
        type="submit"
        className="lenke feil"
        onClick={(e) => {
          if (!confirm(`Avlyse ${tittel}? De andre får beskjed.`)) e.preventDefault();
        }}
      >
        Avlys
      </button>
    );
  }
  if (!velg) {
    return (
      <button type="button" className="lenke feil" onClick={() => setVelg(true)}>
        Avlys
      </button>
    );
  }
  return (
    <div className="kort omfang">
      <p className="kt">Avlys {tittel}</p>
      <button type="submit" name="omfang" value="denne" className="sekundar">
        Bare denne gangen
      </button>
      <button type="submit" name="omfang" value="fremover" className="sekundar">
        Denne og alle senere
      </button>
      <button type="submit" name="omfang" value="alle" className="sekundar">
        Alle gangene
      </button>
      <button type="button" className="lenke" onClick={() => setVelg(false)}>
        Ikke avlys
      </button>
      <p className="dempet liten">De andre får beskjed.</p>
    </div>
  );
}
