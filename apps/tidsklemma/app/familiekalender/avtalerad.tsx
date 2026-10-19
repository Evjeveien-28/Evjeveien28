import Link from "next/link";
import type { Person } from "../husstand/personer";
import { hvemTekst, type Forekomst } from "./data";

/** Fargeprikker for de som skal være med, eller «Alle». */
export function Hvem({ personer, alle }: { personer: string[]; alle: Person[] }) {
  const tekst = hvemTekst(personer, alle);
  if (tekst === "Alle") return <span className="hvem hvem-alle">Alle</span>;
  return (
    <span className="hvem">
      {alle
        .filter((p) => personer.includes(p.id))
        .map((p) => (
          <span key={p.id} className="hvem-person">
            <span className="fargeprikk" style={{ background: p.farge }} aria-hidden="true" />
            {p.navn}
          </span>
        ))}
    </span>
  );
}

export function stripe(personer: string[], alle: Person[]) {
  const farger = alle.filter((p) => personer.includes(p.id)).map((p) => p.farge);
  if (farger.length === 0 || (alle.length > 1 && farger.length === alle.length)) return "var(--valnott)";
  if (farger.length === 1) return farger[0];
  const steg = 100 / farger.length;
  return `linear-gradient(${farger.map((f, i) => `${f} ${i * steg}% ${(i + 1) * steg}%`).join(", ")})`;
}

export function AvtaleRad({ f, personer, over }: { f: Forekomst; personer: Person[]; over?: boolean }) {
  const a = f.avtale;
  const tid = f.fra ?? (f.til ? `til ${f.til}` : "Hele dagen");
  return (
    <li>
      <Link href={`/familiekalender/${a.id}`} className={over ? "avtale over" : "avtale"}>
        <span className={f.fra || f.til ? "atid" : "atid hel"}>
          {tid}
          {f.fra && f.til && <small>–{f.til}</small>}
          {f.antallDager > 1 && (
            <small>
              dag {f.dagNr}/{f.antallDager}
            </small>
          )}
        </span>
        <span className="astripe" style={{ background: stripe(a.personer, personer) }} aria-hidden="true" />
        <span className="pt">
          <b>{a.tittel}</b>
          {a.sted && <small>{a.sted}</small>}
          <Hvem personer={a.personer} alle={personer} />
        </span>
      </Link>
    </li>
  );
}
