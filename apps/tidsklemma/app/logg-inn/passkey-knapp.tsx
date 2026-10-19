"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@hjem/db/browser";
import { enhetenStotterPasskey, erAvbrutt, lagreValg } from "../passkey";

export function PasskeyKnapp() {
  const router = useRouter();
  const [stottet, setStottet] = useState(false);
  const [venter, setVenter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    enhetenStotterPasskey().then(setStottet);
  }, []);

  if (!stottet) return null;

  async function loggInn() {
    setVenter(true);
    setFeil(null);
    const { error } = await createClient().auth.signInWithPasskey();
    setVenter(false);
    if (error) {
      if (!erAvbrutt(error)) {
        setFeil("Fant ingen passkey for Tidsklemma på denne enheten. Bruk e-postlenken under.");
      }
      return;
    }
    lagreValg("ja");
    router.replace("/");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
      <button type="button" onClick={loggInn} disabled={venter} style={{ padding: 12, fontSize: 16 }}>
        {venter ? "Venter …" : "Logg inn med Face ID / fingeravtrykk"}
      </button>
      {feil && <p style={{ color: "#b91c1c", margin: 0 }}>{feil}</p>}
      <p style={{ color: "#555", margin: "8px 0 0" }}>Eller få en innloggingslenke på e-post:</p>
    </div>
  );
}
