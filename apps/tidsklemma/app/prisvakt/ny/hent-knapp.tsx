"use client";

import { useFormStatus } from "react-dom";

/** Det tar noen sekunder å hente varen fra butikken. */
export function HentKnapp() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primar" disabled={pending} style={{ marginTop: 10 }}>
      {pending ? "Henter varen …" : "Følg prisen"}
    </button>
  );
}
