"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@hjem/db/browser";
import { loggInn } from "../actions";
import { enhetenStotterPasskey, erAvbrutt, hentValg, lagreValg } from "../passkey";

const knapp = { padding: 12, fontSize: 16 } as const;
const lenkeknapp = {
  background: "none",
  border: "none",
  padding: "12px 0",
  fontSize: 16,
  color: "#555",
  textDecoration: "underline",
  cursor: "pointer",
  textAlign: "left",
} as const;

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
    <button type="button" onClick={passkey} disabled={venter} style={knapp}>
      {venter ? "Venter …" : "Logg inn med Face ID / fingeravtrykk"}
    </button>
  );

  const epostSkjema = (
    <form action={loggInn} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor="email">E-post</label>
      <input id="email" name="email" type="email" required autoComplete="email" style={{ padding: 12, fontSize: 16 }} />
      <button type="submit" style={knapp}>
        Send innloggingslenke
      </button>
      {epostFeil && <p style={{ color: "#b91c1c" }}>Det gikk ikke. Sjekk adressen og prøv igjen.</p>}
    </form>
  );

  const feilmelding = feil && <p style={{ color: "#b91c1c" }}>{feil}</p>;

  if (harPasskey) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {passkeyKnapp}
        {feilmelding}
        {visEpost ? (
          <div style={{ marginTop: 16 }}>{epostSkjema}</div>
        ) : (
          <button type="button" onClick={() => setVisEpost(true)} style={{ ...lenkeknapp, alignSelf: "flex-start" }}>
            Logg inn med e-post i stedet
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {epostSkjema}
      {stottet && (
        <button type="button" onClick={passkey} disabled={venter} style={{ ...lenkeknapp, alignSelf: "flex-start" }}>
          {venter ? "Venter …" : "Har du passkey? Logg inn med Face ID / fingeravtrykk"}
        </button>
      )}
      {feilmelding}
    </div>
  );
}
