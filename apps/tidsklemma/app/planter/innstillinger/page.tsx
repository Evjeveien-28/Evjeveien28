import Link from "next/link";
import { createClient } from "@hjem/db/server";
import { settFellesAuto } from "../actions";
import { hentAutoJustering, hentHusstand } from "../data";
import { MINST_INTERVALLER, SISTE_INTERVALLER } from "../laering";

export default async function Innstillinger() {
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  const pa = husstand ? await hentAutoJustering(supabase, husstand.id) : true;

  return (
    <>
      <Link href="/planter" className="tilbake">
        ← Planter
      </Link>
      <h2>Innstillinger</h2>
      <div className="strek venstre" />

      <div className="kort">
        <p className="kt">Automatisk justering · {pa ? "på" : "av"}</p>
        <p>
          Appen lærer hvor ofte dere faktisk vanner hver plante, og bruker det i stedet for standard eller verdier du har satt selv.
        </p>
        <ul className="punkter liten">
          <li>Sommer (apr.–sep.) og vinter (okt.–mar.) læres hver for seg.</li>
          <li>
            Bruker medianen av de siste {SISTE_INTERVALLER} intervallene, og først når det finnes minst {MINST_INTERVALLER}.
          </li>
          <li>Uteliggere under halvparten eller over det dobbelte av utgangspunktet tas ikke med.</li>
          <li>Vanninger du merker «Ikke tell» inne på planten, tas ikke med.</li>
        </ul>
        <p className="dempet liten">Gjelder hele husstanden. Den kan også slås av for enkeltplanter.</p>
        <form action={settFellesAuto}>
          <input type="hidden" name="pa" value={pa ? "0" : "1"} />
          <button type="submit" className="sekundar">
            {pa ? "Slå av for alle planter" : "Slå på"}
          </button>
        </form>
      </div>

      <div className="kort">
        <p className="kt">Varsler</p>
        <p>Rød prikk på Planter-flisen når noe trenger vann.</p>
        <p className="dempet liten">Varsel på telefonen med eget klokkeslett kommer senere.</p>
      </div>
    </>
  );
}
