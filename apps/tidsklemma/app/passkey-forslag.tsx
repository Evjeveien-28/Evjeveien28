"use client";

import { useEffect, useState } from "react";
import { Card } from "@hjem/ui";
import { createClient } from "@hjem/db/browser";
import { enhetenStotterPasskey, erAvbrutt, hentValg, lagreValg } from "./passkey";

/** Spør om brukeren vil logge inn med Face ID/fingeravtrykk neste gang. Vises én gang per enhet. */
export function PasskeyForslag() {
  const [vis, setVis] = useState(false);
  const [venter, setVenter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    if (hentValg()) return;
    enhetenStotterPasskey().then(setVis);
  }, []);

  if (!vis) return null;

  async function leggTil() {
    setVenter(true);
    setFeil(null);
    const { error } = await createClient().auth.registerPasskey();
    setVenter(false);
    if (error) {
      if (!erAvbrutt(error)) setFeil("Det gikk ikke å lagre passkeyen. Prøv igjen senere.");
      return;
    }
    lagreValg("ja");
    setVis(false);
  }

  function nei() {
    lagreValg("nei");
    setVis(false);
  }

  return (
    <Card title="Logg inn raskere neste gang">
      <p style={{ marginTop: 0 }}>Vil du bruke Face ID, fingeravtrykk eller skjermlåsen på denne enheten i stedet for e-postlenke?</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={leggTil} disabled={venter} style={{ padding: 12, fontSize: 16 }}>
          {venter ? "Venter …" : "Ja, slå på"}
        </button>
        <button type="button" onClick={nei} disabled={venter} style={{ padding: 12, fontSize: 16 }}>
          Ikke nå
        </button>
      </div>
      {feil && <p style={{ color: "#b91c1c", marginBottom: 0 }}>{feil}</p>}
    </Card>
  );
}
