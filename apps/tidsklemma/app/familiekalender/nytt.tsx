import Link from "next/link";
import type { Person } from "../husstand/personer";
import { sett } from "./actions";
import { Hvem } from "./avtalerad";
import { gjentakelseTekst, type Varsel } from "./data";
import { dagTekst, kl, relativDag } from "./tid";

const merke = { ny: "Ny", endret: "Endret", avlyst: "Avlyst" } as const;

/** Nye, endrede og avlyste avtaler fra de andre. Blir stående til man har markert dem som sett. */
export function Nytt({ varsler, personer, idag }: { varsler: Varsel[]; personer: Person[]; idag: string }) {
  return (
    <section className="kort nytt" aria-label="Nytt i kalenderen">
      <div className="seksjonstopp">
        <p className="kt">Nytt · {varsler.length}</p>
        {varsler.length > 1 && (
          <form action={sett}>
            {varsler.map((v) => (
              <input key={v.id} type="hidden" name="varsel" value={v.id} />
            ))}
            <button type="submit" className="inline-knapp">
              Marker alle som sett
            </button>
          </form>
        )}
      </div>
      <ul className="varsler">
        {varsler.map((v) => {
          const a = v.avtale;
          const fra = personer.find((p) => p.user_id && p.user_id === v.laget_av)?.navn;
          const gjentas = gjentakelseTekst(a, dagTekst);
          const nar = gjentas
            ? `${gjentas.charAt(0).toUpperCase()}${gjentas.slice(1).toLowerCase()} fra ${dagTekst(a.start_dato)}${a.start_tid ? ` kl. ${kl(a.start_tid)}` : ""}`
            : `${a.start_dato <= idag ? relativDag(a.start_dato, idag) : dagTekst(a.start_dato)}${a.start_tid ? ` kl. ${kl(a.start_tid)}` : ""}`;
          return (
            <li key={v.id} className="varsel">
              <span className="pt">
                <span className={`varsel-merke ${v.type}`}>{merke[v.type]}</span>
                {v.type === "avlyst" ? (
                  <b className="struket">{a.tittel}</b>
                ) : (
                  <Link href={`/familiekalender/${a.id}`}>
                    <b>{a.tittel}</b>
                  </Link>
                )}
                <small>
                  {v.endring ?? nar}
                  {fra && ` · ${v.type === "ny" ? "lagt inn" : v.type === "endret" ? "endret" : "avlyst"} av ${fra}`}
                </small>
                {v.type !== "avlyst" && <Hvem personer={a.personer} alle={personer} />}
              </span>
              <form action={sett}>
                <input type="hidden" name="varsel" value={v.id} />
                <button type="submit" className="sekundar liten-knapp">
                  Sett
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
