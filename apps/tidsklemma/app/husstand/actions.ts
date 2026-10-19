"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";

export async function inviter(formData: FormData) {
  const husstand = String(formData.get("husstand") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!husstand || !email) redirect("/husstand?feil=1");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inviter_til_husstand", { hid: husstand, epost: email });
  if (error) redirect("/husstand?feil=1");

  revalidatePath("/husstand");
  redirect(`/husstand?${data === "medlem" ? "lagt-til" : "invitert"}=${encodeURIComponent(email.toLowerCase())}`);
}

export async function trekkTilbake(formData: FormData) {
  const husstand = String(formData.get("husstand") ?? "");
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  await supabase.from("household_invitations").delete().eq("household_id", husstand).eq("email", email);

  revalidatePath("/husstand");
  redirect("/husstand");
}
