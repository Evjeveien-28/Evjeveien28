"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { sendPush, type Abonnement } from "../../push/send";

/** Lagrer denne enheten, så den kan få push. */
export async function lagreAbonnement(a: { endpoint: string; p256dh: string; auth: string; enhet: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_abonnement")
    .upsert({ endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth, enhet: a.enhet.slice(0, 200) }, { onConflict: "endpoint" });
  return !error;
}

export async function fjernAbonnement(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_abonnement").delete().eq("endpoint", endpoint);
}

export async function testvarsel() {
  const supabase = await createClient();
  const { data } = await supabase.from("push_abonnement").select("endpoint, p256dh, auth");
  const utlopt = await sendPush((data as Abonnement[] | null) ?? [], {
    tittel: "Tidsklemma",
    tekst: "Varsler virker 🎉",
    url: "/meg/varsler",
    merke: "test",
  });
  if (utlopt.length) await supabase.rpc("fjern_push_abonnement", { endepunkter: utlopt });
  return (data?.length ?? 0) - utlopt.length;
}

/** Bryterne for kalender og planter, og klokkeslettet for plantevarselet. */
export async function lagreInnstilling(formData: FormData) {
  const felt = String(formData.get("felt") ?? "");
  const supabase = await createClient();
  const { data: meg } = await supabase.auth.getClaims();
  if (!meg) redirect("/logg-inn");
  let endring: Record<string, unknown>;
  if (felt === "kalender" || felt === "planter") endring = { [felt]: formData.get("pa") === "1" };
  else if (felt === "planter_tid" && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(formData.get("tid")))) endring = { planter_tid: `${formData.get("tid")}:00` };
  else redirect("/meg/varsler");
  await supabase.from("push_innstillinger").upsert({ user_id: meg.claims.sub, ...endring }, { onConflict: "user_id" });
  revalidatePath("/meg/varsler");
  redirect("/meg/varsler");
}
