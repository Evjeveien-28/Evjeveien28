"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { angre } from "./actions";
import { iDag, kortDato } from "./tid";

/** Melding nederst etter registrert vanning, med «Angre» i noen sekunder. */
export function Angre({ vanninger, dato, tilbake }: { vanninger: string[]; dato?: string; tilbake: string }) {
  const router = useRouter();
  const sti = usePathname();
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVis(false);
      // Fjern angre-id-ene fra adressen, så meldingen ikke kommer tilbake ved oppdatering.
      router.replace(sti, { scroll: false });
    }, 8000);
    return () => clearTimeout(t);
  }, [router, sti]);

  if (!vis) return null;

  const antall = vanninger.length;
  const hva = antall === 1 ? "Registrert som vannet" : `${antall} planter registrert som vannet`;
  const nar = dato && dato !== iDag() ? ` ${kortDato(dato)}` : "";

  return (
    <div className="toast" role="status">
      <span>
        {hva}
        {nar}
      </span>
      <form action={angre}>
        {vanninger.map((id) => (
          <input key={id} type="hidden" name="vanning" value={id} />
        ))}
        <input type="hidden" name="tilbake" value={tilbake} />
        <button type="submit">Angre</button>
      </form>
    </div>
  );
}
