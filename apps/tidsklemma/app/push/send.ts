import webpush from "web-push";

export type Abonnement = { endpoint: string; p256dh: string; auth: string };
export type Melding = { tittel: string; tekst: string; url: string; merke?: string };

/** Nøklene settes i Vercel. Uten dem sendes ingenting, og innstillingene sier fra. */
export function pushKlar() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let satt = false;
function oppsett() {
  if (satt) return;
  webpush.setVapidDetails("https://tidsklemma.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  satt = true;
}

/** Sender til alle enhetene. Gir tilbake enhetene som ikke finnes lenger, så de kan fjernes. */
export async function sendPush(abonnementer: Abonnement[], melding: Melding): Promise<string[]> {
  if (!pushKlar() || abonnementer.length === 0) return [];
  oppsett();
  const innhold = JSON.stringify(melding);
  const svar = await Promise.allSettled(
    abonnementer.map((a) =>
      webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, innhold, { TTL: 60 * 60 * 12, urgency: "normal" }),
    ),
  );
  return svar.flatMap((s, i) => {
    if (s.status === "fulfilled") return [];
    const kode = (s.reason as { statusCode?: number }).statusCode;
    if (kode !== 404 && kode !== 410) console.error("Push feilet", kode, (s.reason as Error).message);
    return kode === 404 || kode === 410 ? [abonnementer[i]!.endpoint] : [];
  });
}
