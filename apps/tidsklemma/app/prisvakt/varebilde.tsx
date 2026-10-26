import type { Vare } from "./data";

/** Produktbildet fra butikken, eller en lapp når det mangler. */
export function Varebilde({ vare, stor }: { vare: Pick<Vare, "bilde_url" | "navn">; stor?: boolean }) {
  return (
    <span className={stor ? "vbilde stor" : "vbilde"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {vare.bilde_url ? <img src={vare.bilde_url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span aria-hidden="true">🏷️</span>}
    </span>
  );
}
