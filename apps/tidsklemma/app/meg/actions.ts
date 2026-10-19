"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";

/** Fornavn lagres på brukeren i Supabase, så det følger med på alle enheter. */
export async function lagreFornavn(formData: FormData) {
  const fornavn = String(formData.get("fornavn") ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  const tilbake = formData.get("tilbake") === "/" ? "/" : "/meg";
  if (!fornavn) redirect(`${tilbake}?feil=fornavn`);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { fornavn } });
  if (error) redirect(`${tilbake}?feil=fornavn`);
  // Ny innloggingsnøkkel med det nye navnet, så det vises med en gang.
  await supabase.auth.refreshSession();

  revalidatePath("/", "layout");
  redirect(tilbake === "/" ? "/" : "/meg?lagret=1");
}
