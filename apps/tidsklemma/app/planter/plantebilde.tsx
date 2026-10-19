import { Ikon } from "../ikoner";
import { finnIKatalog, type Gruppe } from "./katalog";

const farger: Record<Gruppe, { fg: string; bg: string }> = {
  kaktus: { fg: "#66723f", bg: "#e7ebdd" },
  sukkulent: { fg: "#66723f", bg: "#e7ebdd" },
  torke: { fg: "#4d5a7a", bg: "#dce6ee" },
  middels: { fg: "#4a2e1c", bg: "#e8dcc6" },
  fuktig: { fg: "#734623", bg: "#efe2cf" },
  torst: { fg: "#4d5a7a", bg: "#dce6ee" },
  orkide: { fg: "#734623", bg: "#efe2cf" },
};

/** Rundt plante-ikon med farge etter type. Byttes ut med bilde i steg 2. */
export function Plantebilde({ katalogId, storrelse = 48 }: { katalogId: string | null; storrelse?: number }) {
  const { fg, bg } = farger[finnIKatalog(katalogId)?.gruppe ?? "middels"];
  return (
    <span className="pbilde" style={{ width: storrelse, height: storrelse, background: bg, color: fg }} aria-hidden="true">
      <Ikon navn="plante" storrelse={Math.round(storrelse * 0.6)} />
    </span>
  );
}
