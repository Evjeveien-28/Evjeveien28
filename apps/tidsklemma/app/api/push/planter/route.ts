import { createClient } from "@hjem/db/server";
import { beregnStatus, type PlanteRad, type Vanning } from "../../../planter/data";
import { iDag } from "../../../planter/tid";
import { sendPush, type Abonnement } from "../../../push/send";

type Grunnlag = {
  mottakere: { user_id: string; husstander: string[] | null; abonnementer: Abonnement[] }[];
  husstander: Record<string, { auto: boolean; planter: (PlanteRad & { vanninger: Vanning[] })[] }>;
};

/**
 * Kalles hvert kvarter av en jobb i Supabase (pg_cron). Hemmeligheten jobben sender med,
 * sjekkes av databasen, som også bestemmer hvem som skal ha varsel nå.
 */
export async function POST(request: Request) {
  const hemmelig = request.headers.get("x-hemmelighet") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("push_planter_grunnlag", { hemmelig });
  if (error) return Response.json({ feil: error.message }, { status: 403 });

  const { mottakere, husstander } = data as Grunnlag;
  const idag = iDag();
  const utlopt: string[] = [];
  let sendt = 0;
  for (const m of mottakere) {
    const trenger = (m.husstander ?? []).flatMap((hid) => {
      const h = husstander[hid];
      if (!h) return [];
      return h.planter.map(({ vanninger, ...p }) => beregnStatus(p, vanninger, h.auto, idag)).filter((p) => p.trengerVann);
    });
    if (trenger.length === 0) continue;
    const navn = trenger.map((p) => p.navn);
    const liste = navn.length <= 3 ? navn.join(", ").replace(/, ([^,]*)$/, " og $1") : `${navn.slice(0, 2).join(", ")} og ${navn.length - 2} til`;
    utlopt.push(
      ...(await sendPush(m.abonnementer, {
        tittel: "Planter",
        tekst: `${trenger.length === 1 ? "1 plante trenger" : `${trenger.length} planter trenger`} vann: ${liste}`,
        url: "/planter",
        merke: "planter",
      })),
    );
    sendt++;
  }
  if (utlopt.length) await supabase.rpc("fjern_push_abonnement", { endepunkter: utlopt, hemmelig });
  return Response.json({ sendt });
}
