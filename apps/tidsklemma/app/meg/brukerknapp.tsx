import Link from "next/link";
import { hentBruker } from "./bruker";

/** Rundt ikon øverst til høyre med forbokstaven din. Vises bare når du er logget inn. */
export async function Brukerknapp() {
  const bruker = await hentBruker();
  if (!bruker) return null;
  return (
    <Link href="/meg" className="brukerknapp" aria-label={`Meg: ${bruker.fornavn ?? bruker.email}`}>
      {bruker.forbokstav}
    </Link>
  );
}
