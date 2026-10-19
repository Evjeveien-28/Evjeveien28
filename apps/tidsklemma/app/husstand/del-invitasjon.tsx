"use client";

import { useState } from "react";

/** Del lenken til appen med den som er invitert, via delingsmenyen på telefonen eller utklippstavlen. */
export function DelInvitasjon({ email }: { email: string }) {
  const [kopiert, setKopiert] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.origin;
  const tekst = `Du er invitert til Tidsklemma! Gå til ${url} og logg inn med ${email}.`;

  async function del() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tidsklemma", text: tekst });
      } catch {
        // Brukeren lukket delingsmenyen.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(tekst);
      setKopiert(true);
    } catch {
      // Utklippstavlen er ikke tilgjengelig.
    }
  }

  return (
    <button type="button" className="sekundar" onClick={del}>
      {kopiert ? "Kopiert!" : "Del"}
    </button>
  );
}
