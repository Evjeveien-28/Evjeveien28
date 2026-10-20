"use client";

import { useEffect, useState } from "react";
import { fjernAbonnement, lagreAbonnement, testvarsel } from "./actions";

type Tilstand = "laster" | "stottesIkke" | "hjemskjerm" | "avslatt" | "av" | "pa";

function nokkel(base64: string) {
  const tekst = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(tekst, (t) => t.charCodeAt(0));
}

function enhetsnavn() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Nettleser";
}

/** Slå push av og på for enheten man står på. Hver telefon må slå det på selv. */
export function PushEnhet({ offentligNokkel }: { offentligNokkel: string }) {
  const [tilstand, setTilstand] = useState<Tilstand>("laster");
  const [melding, setMelding] = useState<string | null>(null);
  const [opptatt, setOpptatt] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // På iPhone finnes push bare når appen er lagt på hjemskjermen.
        const ios = /iPhone|iPad/.test(navigator.userAgent);
        return setTilstand(ios ? "hjemskjerm" : "stottesIkke");
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (Notification.permission === "denied") return setTilstand("avslatt");
      setTilstand(sub ? "pa" : "av");
    })().catch(() => setTilstand("stottesIkke"));
  }, []);

  async function slaPa() {
    setOpptatt(true);
    setMelding(null);
    try {
      const svar = await Notification.requestPermission();
      if (svar !== "granted") return setTilstand(svar === "denied" ? "avslatt" : "av");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: nokkel(offentligNokkel) });
      const j = sub.toJSON();
      const ok = await lagreAbonnement({ endpoint: sub.endpoint, p256dh: j.keys!.p256dh!, auth: j.keys!.auth!, enhet: enhetsnavn() });
      if (!ok) throw new Error("lagre");
      setTilstand("pa");
    } catch {
      setMelding("Det gikk ikke å slå på varsler. Prøv igjen.");
    } finally {
      setOpptatt(false);
    }
  }

  async function slaAv() {
    setOpptatt(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fjernAbonnement(sub.endpoint);
      await sub.unsubscribe();
    }
    setTilstand("av");
    setOpptatt(false);
  }

  async function test() {
    setOpptatt(true);
    const antall = await testvarsel();
    setMelding(antall > 0 ? "Testvarsel sendt. Det kan ta noen sekunder." : "Fant ingen enheter å sende til.");
    setOpptatt(false);
  }

  if (tilstand === "laster") return <p className="dempet">Sjekker …</p>;
  if (tilstand === "hjemskjerm")
    return (
      <>
        <p>På iPhone virker varsler bare når Tidsklemma er lagt på hjemskjermen.</p>
        <p className="dempet liten">I Safari: trykk Del og så «Legg til på Hjem-skjerm». Åpne appen derfra og kom tilbake hit.</p>
      </>
    );
  if (tilstand === "stottesIkke") return <p>Denne nettleseren kan ikke få varsler.</p>;
  if (tilstand === "avslatt")
    return (
      <>
        <p>Varsler er slått av for Tidsklemma i innstillingene på enheten.</p>
        <p className="dempet liten">På iPhone: Innstillinger → Varslinger → Tidsklemma → Tillat varslinger.</p>
      </>
    );
  return (
    <>
      <p>{tilstand === "pa" ? "Varsler er på for denne enheten." : "Varsler er av for denne enheten."}</p>
      {melding && <p className="dempet liten">{melding}</p>}
      {tilstand === "pa" ? (
        <div className="inline-rad">
          <button type="button" className="inline-knapp" onClick={test} disabled={opptatt}>
            Send et testvarsel
          </button>
          <button type="button" className="inline-knapp" onClick={slaAv} disabled={opptatt}>
            Slå av her
          </button>
        </div>
      ) : (
        <button type="button" className="primar" onClick={slaPa} disabled={opptatt} style={{ marginTop: 6 }}>
          Slå på varsler her
        </button>
      )}
    </>
  );
}
