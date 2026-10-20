import type { createClient } from "@hjem/db/server";
import { hentBruker } from "../meg/bruker";
import { sendPush, type Abonnement } from "../push/send";

type Klient = Awaited<ReturnType<typeof createClient>>;

/**
 * Varsel i appen («Nytt»-kortet) og push til de andre som har slått på kalendervarsler.
 * `hva` gjelder `tittel`, f.eks. «la inn», og `nar` er dagen eller endringen.
 */
export async function varsle(
  supabase: Klient,
  aid: string,
  hva: "ny" | "endret" | "avlyst",
  beskrivelse: string | null,
  push: { tittel: string; nar: string; url: string },
) {
  const db = supabase.schema("kalender");
  await db.rpc("varsle", beskrivelse ? { aid, hva, beskrivelse } : { aid, hva });

  const [{ data }, bruker] = await Promise.all([db.rpc("push_mottakere", { aid }), hentBruker()]);
  const mottakere = (data as Abonnement[] | null) ?? [];
  if (mottakere.length === 0) return;
  const hvem = bruker?.fornavn ?? "Noen";
  const verb = hva === "ny" ? "la inn" : hva === "endret" ? "endret" : "avlyste";
  const utlopt = await sendPush(mottakere, {
    tittel: "Familiekalender",
    tekst: `${hvem} ${verb} ${push.tittel}: ${push.nar}`,
    url: push.url,
    merke: `avtale-${aid}`,
  });
  if (utlopt.length) await supabase.rpc("fjern_push_abonnement", { endepunkter: utlopt });
}
