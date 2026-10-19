"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@hjem/ui";
import { createClient } from "@hjem/db/browser";
import { enhetenStotterPasskey, erAvbrutt, lagreValg } from "../passkey";

type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

const dato = (iso: string) => new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });

export function Passkeys() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [stottet, setStottet] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  const hent = useCallback(async () => {
    const { data, error } = await createClient().auth.passkey.list();
    if (error) setFeil("Klarte ikke å hente passkeys.");
    // Ingen passkeys igjen: da skal ikke innloggingssiden lenger foreslå Face ID først.
    if (data && data.length === 0) lagreValg(null);
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    hent();
    enhetenStotterPasskey().then(setStottet);
  }, [hent]);

  async function leggTil() {
    setFeil(null);
    const { error } = await createClient().auth.registerPasskey();
    if (error) {
      if (!erAvbrutt(error)) setFeil("Det gikk ikke å lagre passkeyen.");
      return;
    }
    lagreValg("ja");
    hent();
  }

  async function slett(id: string) {
    if (!confirm("Slette denne passkeyen? Enheten må da logge inn med e-postlenke.")) return;
    setFeil(null);
    const { error } = await createClient().auth.passkey.delete({ passkeyId: id });
    if (error) setFeil("Det gikk ikke å slette passkeyen.");
    hent();
  }

  if (!passkeys) return <p>Henter …</p>;

  return (
    <>
      {passkeys.length === 0 && <p style={{ color: "#555" }}>Du har ingen passkeys ennå.</p>}
      {passkeys.map((p) => (
        <Card key={p.id} title={p.friendly_name || "Passkey"}>
          <p style={{ marginTop: 0, color: "#555" }}>
            Lagt til {dato(p.created_at)}
            {p.last_used_at && <> · sist brukt {dato(p.last_used_at)}</>}
          </p>
          <button type="button" onClick={() => slett(p.id)} style={{ padding: 12, fontSize: 16 }}>
            Slett
          </button>
        </Card>
      ))}
      {stottet && (
        <button type="button" onClick={leggTil} style={{ padding: 12, fontSize: 16 }}>
          Legg til passkey på denne enheten
        </button>
      )}
      {feil && <p style={{ color: "#b91c1c" }}>{feil}</p>}
    </>
  );
}
