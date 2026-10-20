import Link from "next/link";
import { Brukerknapp } from "./meg/brukerknapp";
import { Topp } from "./logo";

/**
 * Felles side: «Tidsklemma» og profilikonet over rammen. Inne i rammen tilbake-lenke, tittel
 * (med eventuell handling ved siden av) og innholdet.
 */
export function Side({
  tittel,
  tilbake,
  handling,
  children,
}: {
  tittel?: React.ReactNode;
  tilbake?: { href: string; navn: string };
  handling?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sidetopp">
        <Topp />
        <Brukerknapp />
      </header>
      <main className="ramme">
        {tilbake && (
          <Link href={tilbake.href} className="tilbake">
            ← {tilbake.navn}
          </Link>
        )}
        {tittel && (
          <>
            <div className="tittelrad">
              <h2 className={typeof tittel === "string" && tittel.length > 12 ? "lang" : undefined}>{tittel}</h2>
              {handling}
            </div>
            <div className="strek venstre" />
          </>
        )}
        {children}
      </main>
    </>
  );
}
