"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lagreNyttBilde } from "./ny/gjenkjenn";

/** «+» åpner kameraet med en gang. Bildet tas med videre til /planter/ny, der forslagene vises. */
export function NyPlanteKnapp() {
  const router = useRouter();
  const [venter, setVenter] = useState(false);

  async function valgt(fil: File | undefined) {
    if (!fil) return;
    setVenter(true);
    try {
      await lagreNyttBilde(fil);
    } catch {
      // Uten sessionStorage tar man bildet på nytt på neste side.
    }
    router.push("/planter/ny");
  }

  return (
    <label className="pluss" aria-label="Legg til plante med bilde" aria-busy={venter}>
      {venter ? "…" : "+"}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="visuelt-skjult"
        onChange={(e) => valgt(e.target.files?.[0])}
      />
    </label>
  );
}
