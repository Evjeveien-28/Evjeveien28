"use client";

import { useState } from "react";
import type { Person } from "../husstand/personer";
import { lagre } from "./actions";
import type { Avtale } from "./data";

/** Skjema for ny avtale og for endring. Hvem som skal være med må velges, og «Alle» velger alle på én gang. */
export function AvtaleSkjema({
  husstand,
  personer,
  avtale,
  dato,
  idag,
  imorgen,
}: {
  husstand: string;
  personer: Person[];
  avtale?: Avtale;
  dato: string;
  idag: string;
  imorgen: string;
}) {
  const [valgte, setValgte] = useState<string[]>(avtale?.personer ?? []);
  const [dag, setDag] = useState(avtale?.start_dato ?? dato);
  const [velgDato, setVelgDato] = useState(dag !== idag && dag !== imorgen);
  const [flereDager, setFlereDager] = useState(!!avtale && avtale.slutt_dato > avtale.start_dato);
  const [sluttDato, setSluttDato] = useState(avtale?.slutt_dato ?? dato);
  const [heleDagen, setHeleDagen] = useState(!!avtale && !avtale.start_tid);
  const [fra, setFra] = useState(avtale?.start_tid?.slice(0, 5) ?? "");

  const alle = personer.length > 0 && personer.every((p) => valgte.includes(p.id));
  const veksle = (id: string) => setValgte((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  return (
    <form action={lagre} className="avtaleskjema">
      <input type="hidden" name="husstand" value={husstand} />
      {avtale && <input type="hidden" name="avtale" value={avtale.id} />}

      <label htmlFor="tittel" className="kt">
        Hva
      </label>
      <input
        id="tittel"
        name="tittel"
        required
        maxLength={80}
        defaultValue={avtale?.tittel}
        autoFocus={!avtale}
        autoComplete="off"
        placeholder="F.eks. Fotballtrening"
        className="felt"
      />

      <fieldset className="gruppe">
        <legend className="kt">Hvem skal være med</legend>
        <div className="chips">
          {personer.length > 1 && (
            <button type="button" className="chip chip-alle" aria-pressed={alle} onClick={() => setValgte(alle ? [] : personer.map((p) => p.id))}>
              Alle
            </button>
          )}
          {personer.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              aria-pressed={valgte.includes(p.id)}
              onClick={() => veksle(p.id)}
              style={{ "--farge": p.farge } as React.CSSProperties}
            >
              <span className="fargeprikk" aria-hidden="true" />
              {p.navn}
            </button>
          ))}
        </div>
        {valgte.map((id) => (
          <input key={id} type="hidden" name="person" value={id} />
        ))}
      </fieldset>

      <fieldset className="gruppe">
        <legend className="kt">Når</legend>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={!velgDato && dag === idag} onClick={() => (setDag(idag), setVelgDato(false))}>
            I dag
          </button>
          <button type="button" className="chip" aria-pressed={!velgDato && dag === imorgen} onClick={() => (setDag(imorgen), setVelgDato(false))}>
            I morgen
          </button>
          <button type="button" className="chip" aria-pressed={velgDato} onClick={() => setVelgDato(true)}>
            Velg dato
          </button>
        </div>
        {velgDato ? (
          <input
            type="date"
            name="dato"
            required
            min={avtale && avtale.start_dato < idag ? avtale.start_dato : idag}
            value={dag}
            onChange={(e) => setDag(e.target.value)}
            aria-label="Dato"
            className="felt"
          />
        ) : (
          <input type="hidden" name="dato" value={dag} />
        )}

        {!heleDagen && (
          <div className="to-felt">
            <label>
              <span className="dempet liten">Fra</span>
              <input type="time" name="fra" required value={fra} onChange={(e) => setFra(e.target.value)} className="felt" />
            </label>
            <label>
              <span className="dempet liten">
                Til <span className="valgfritt">(valgfritt)</span>
              </span>
              <input type="time" name="til" defaultValue={avtale?.slutt_tid?.slice(0, 5)} className="felt" />
            </label>
          </div>
        )}
        <button type="button" role="switch" aria-checked={heleDagen} className="bryter" onClick={() => setHeleDagen((h) => !h)}>
          <span className="bryter-tekst">Hele dagen</span>
          <span className="bryter-spor" aria-hidden="true">
            <span className="bryter-knott" />
          </span>
        </button>
        {heleDagen && <input type="hidden" name="hele_dagen" value="1" />}
        <button type="button" role="switch" aria-checked={flereDager} className="bryter" onClick={() => setFlereDager((f) => !f)}>
          <span className="bryter-tekst">Varer flere dager</span>
          <span className="bryter-spor" aria-hidden="true">
            <span className="bryter-knott" />
          </span>
        </button>
        {flereDager && (
          <>
            <input type="hidden" name="flere_dager" value="1" />
            <label>
              <span className="dempet liten">Til og med</span>
              <input
                type="date"
                name="slutt_dato"
                required
                min={dag}
                value={sluttDato < dag ? dag : sluttDato}
                onChange={(e) => setSluttDato(e.target.value)}
                className="felt"
              />
            </label>
          </>
        )}
      </fieldset>

      <label htmlFor="sted" className="kt">
        Hvor <span className="valgfritt">(valgfritt)</span>
      </label>
      <input id="sted" name="sted" maxLength={80} defaultValue={avtale?.sted ?? ""} autoComplete="off" className="felt" />

      {valgte.length === 0 && <p className="dempet liten">Velg hvem som skal være med.</p>}
      <button type="submit" className="primar" disabled={valgte.length === 0} style={{ marginTop: 8 }}>
        {avtale ? "Lagre" : "Legg inn"}
      </button>
    </form>
  );
}
