import Link from "next/link";
import { Fragment } from "react";
import type { PlanteStatus } from "./data";
import { arstid, MINST_INTERVALLER, type Arstid, type Kilde } from "./laering";

const kildenavn: Record<Kilde, string> = { laert: "lært", manuelt: "satt av deg", standard: "standard" };
const arstider: Arstid[] = ["sommer", "vinter"];

/** Viser standard, lært og manuelt intervall for begge årstider, og hvilket som brukes. */
export function Intervallkort({
  plante,
  fellesAuto,
  idag,
  settAuto,
  tilbakestill,
}: {
  plante: PlanteStatus;
  fellesAuto: boolean;
  idag: string;
  settAuto: (f: FormData) => Promise<void>;
  tilbakestill: (f: FormData) => Promise<void>;
}) {
  const na = arstid(idag);
  const valgNa = plante.valg[na];
  const celle = (a: Arstid, kilde: Kilde, verdi: React.ReactNode) => {
    const iBruk = plante.valg[a].kilde === kilde;
    return (
      <td className={iBruk ? "i-bruk" : undefined}>
        {iBruk ? <span className="merke-bruk">{verdi}</span> : verdi}
        {iBruk && <span className="visuelt-skjult"> (i bruk)</span>}
      </td>
    );
  };
  const harManuelt = plante.manuelt_sommer !== null || plante.manuelt_vinter !== null;

  let forklaring: string;
  const dager = (n: number) => (n === 1 ? "1 dag" : `${n} dager`);
  if (valgNa.kilde === "laert") forklaring = `Bruker lært intervall: ${dager(valgNa.dager)}, fra de siste ${valgNa.laert!.antall} intervallene.`;
  else if (valgNa.auto) {
    forklaring = `Lærer fortsatt. Trenger ${MINST_INTERVALLER} intervaller i ${na === "vinter" ? "vintersesongen" : "sommersesongen"}. Til da brukes ${kildenavn[valgNa.kilde]}.`;
  } else forklaring = `Bruker ${kildenavn[valgNa.kilde]}: ${dager(valgNa.dager)}.`;

  return (
    <div className="kort intervallkort">
      <p className="kt">Vanningsintervall i dager</p>
      <table className="intervaller">
        <thead>
          <tr>
            <th scope="col"><span className="visuelt-skjult">Kilde</span></th>
            {arstider.map((a) => (
              <th key={a} scope="col" className={a === na ? "na" : undefined}>
                {a === "sommer" ? "Sommer" : "Vinter"}
                {a === na && <span className="dempet"> · nå</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Lært</th>
            {arstider.map((a) => {
              const l = plante.valg[a].laert;
              return <Fragment key={a}>{celle(a, "laert", l ? <>{l.dager} <small className="dempet">({l.antall})</small></> : "–")}</Fragment>;
            })}
          </tr>
          <tr>
            <th scope="row">Satt av deg</th>
            {arstider.map((a) => <Fragment key={a}>{celle(a, "manuelt", plante.valg[a].manuelt ?? "–")}</Fragment>)}
          </tr>
          <tr>
            <th scope="row">Standard</th>
            {arstider.map((a) => <Fragment key={a}>{celle(a, "standard", plante.valg[a].standard)}</Fragment>)}
          </tr>
        </tbody>
      </table>
      <p className="liten">{forklaring}</p>

      <div className="auto-rad">
        {fellesAuto ? (
          <form action={settAuto} className="bryter-skjema">
            <input type="hidden" name="plante" value={plante.id} />
            <input type="hidden" name="pa" value={plante.auto_justering ? "0" : "1"} />
            <button type="submit" role="switch" aria-checked={plante.auto_justering} className="bryter">
              <span className="bryter-tekst">Automatisk justering</span>
              <span className="bryter-spor" aria-hidden="true">
                <span className="bryter-knott" />
              </span>
            </button>
          </form>
        ) : (
          <>
            <span>
              Automatisk justering: <b>av for hele husstanden</b>
            </span>
            <Link href="/planter/innstillinger" className="mini-lenke">
              Innstillinger
            </Link>
          </>
        )}
      </div>

      <div className="inline-rad">
        <Link href={`/planter/${plante.id}/endre`} className="inline-knapp">
          Sett selv
        </Link>
        {(harManuelt || plante.auto_justering) && (
          <form action={tilbakestill}>
            <input type="hidden" name="plante" value={plante.id} />
            <button type="submit" className="inline-knapp">
              Tilbake til standard
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

