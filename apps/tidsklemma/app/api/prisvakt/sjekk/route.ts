import { createClient } from "@hjem/db/server";
import { kr } from "../../../prisvakt/data";
import { hentProdukt } from "../../../prisvakt/hent";
import { sendPush, type Abonnement } from "../../../push/send";

export const maxDuration = 60;

type Grunnlag = { id: string; url: string; navn: string; pris: number; onsket_pris: number | null; abonnementer: Abonnement[] }[];

/**
 * Kalles hver morgen av en jobb i Supabase (pg_cron), med samme hemmelighet som plantevarslene.
 * Henter prisen for alle varene, lagrer den, og sender push når prisen har falt.
 */
export async function POST(request: Request) {
  const hemmelig = request.headers.get("x-hemmelighet") ?? "";
  const supabase = await createClient();
  const db = supabase.schema("prisvakt");
  const { data, error } = await db.rpc("sjekk_grunnlag", { hemmelig });
  if (error) return Response.json({ feil: error.message }, { status: 403 });

  const varer = data as Grunnlag;
  const utlopt: string[] = [];
  let falt = 0;
  // Noen få om gangen, så vi ikke belaster butikkene.
  for (let i = 0; i < varer.length; i += 4) {
    await Promise.all(
      varer.slice(i, i + 4).map(async (v) => {
        const svar = await hentProdukt(v.url);
        const gammel = Number(v.pris);
        await db.rpc("lagre_sjekk", {
          hemmelig,
          vid: v.id,
          ny_pris: svar.ok ? svar.produkt.pris : null,
          lager: svar.ok ? svar.produkt.paLager : null,
          feilmelding: svar.ok ? null : svar.feil,
        });
        if (!svar.ok || svar.produkt.pris >= gammel) return;
        falt++;
        const onsket = v.onsket_pris == null ? null : Number(v.onsket_pris);
        const under = onsket != null && svar.produkt.pris <= onsket;
        utlopt.push(
          ...(await sendPush(v.abonnementer, {
            tittel: under ? "Prisvakt: under ønsket pris" : "Prisvakt: billigere",
            tekst: `${v.navn}: ${kr(gammel)} → ${kr(svar.produkt.pris)}`,
            url: `/prisvakt/${v.id}`,
            merke: `pris-${v.id}`,
          })),
        );
      }),
    );
  }
  if (utlopt.length) await supabase.rpc("fjern_push_abonnement", { endepunkter: utlopt, hemmelig });
  return Response.json({ sjekket: varer.length, falt });
}
