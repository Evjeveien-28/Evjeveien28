"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@hjem/db/browser";
import { loggInn } from "../actions";
import { Ikon } from "../ikoner";
import { enhetenStotterPasskey, erAvbrutt, hentValg, lagreValg } from "../passkey";

/**
 * Har enheten en passkey, er Face ID/fingeravtrykk det eneste som vises, og e-post ligger bak en lenke.
 * Ellers er e-post standard, med passkey som et mindre valg (for passkeys som er synkronisert fra en annen enhet).
 */
export function Innlogging({ epostFeil }: { epostFeil: boolean }) {
  const router = useRouter();
  const [stottet, setStottet] = useState(false);
  const [harPasskey, setHarPasskey] = useState(false);
  const [visEpost, setVisEpost] = useState(epostFeil);
  const [venter, setVenter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    enhetenStotterPasskey().then((s) => {
      setStottet(s);
      setHarPasskey(s && hentValg() === "ja");
    });
  }, []);

  async function passkey() {
    setVenter(true);
    setFeil(null);
    const { error } = await createClient().auth.signInWithPasskey();
    setVenter(false);
    if (error) {
      if (!erAvbrutt(error)) setFeil("Fant ingen passkey for Tidsklemma på denne enheten. Logg inn med e-post.");
      return;
    }
    lagreValg("ja");
    router.replace("/");
    router.refresh();
  }

  const passkeyKnapp = (
    <button type="button" className="primar" onClick={passkey} disabled={venter}>
      <Ikon navn="faceid" storrelse={20} />
      {venter ? "Venter …" : "Logg inn med Face ID"}
    </button>
  );

  const epostSkjema = (
    <form action={loggInn}>
      <label htmlFor="email" className="kt">
        E-post
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" className="felt" />
      <button type="submit" className="primar">
        Send innloggingslenke
      </button>
      {epostFeil && <p className="feil">Det gikk ikke. Sjekk adressen, eller be noen i husstanden om å invitere deg.</p>}
    </form>
  );

  const feilmelding = feil && <p className="feil">{feil}</p>;

  if (harPasskey) {
    return (
      <div className="bunnknapper">
        {visEpost && <div style={{ marginBottom: 16 }}>{epostSkjema}</div>}
        {passkeyKnapp}
        {feilmelding}
        {!visEpost && (
          <button type="button" className="lenke" onClick={() => setVisEpost(true)}>
            Logg inn med e-post i stedet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bunnknapper">
      {epostSkjema}
      {stottet && (
        <button type="button" className="lenke" onClick={passkey} disabled={venter}>
          {venter ? "Venter …" : "Har du passkey? Logg inn med Face ID / fingeravtrykk"}
        </button>
      )}
      {feilmelding}
    </div>
  );
}
