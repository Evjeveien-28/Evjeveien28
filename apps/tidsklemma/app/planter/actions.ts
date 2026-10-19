"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@hjem/db/server";
import { hentHusstand } from "./data";
import { finnIKatalog, grupper, intervaller, type Gruppe } from "./katalog";
import { erGyldigDato, iDag, leggTilDager } from "./tid";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ider(formData: FormData, felt: string) {
  return formData.getAll(felt).map(String).filter((id) => uuid.test(id));
}

/** Bare stier inne i plante-delen, så skjemaet ikke kan sende brukeren andre steder. */
function tilbake(formData: FormData) {
  const sti = String(formData.get("tilbake") ?? "/planter");
  return /^\/planter(\/[0-9a-f-]{36})?$/.test(sti) ? sti : "/planter";
}

function planterDb() {
  return createClient().then((s) => s.schema("planter"));
}

/**
 * Registrer vanning av én eller flere planter. Uten dato gjelder det i dag; med `dager-siden` eller
 * `dato` etterregistreres det. Sender med id-ene som ble lagt inn, så de kan angres.
 */
export async function vann(formData: FormData) {
  const planter = ider(formData, "plante");
  const idag = iDag();
  let dato = idag;
  const dagerSiden = Number(formData.get("dager-siden") ?? 0);
  if (dagerSiden > 0 && dagerSiden < 366) dato = leggTilDager(idag, -dagerSiden);
  const valgt = String(formData.get("dato") ?? "");
  if (valgt) {
    if (!erGyldigDato(valgt) || valgt > idag) redirect(`${tilbake(formData)}?feil=dato`);
    dato = valgt;
  }
  if (planter.length === 0) redirect(tilbake(formData));

  const db = await planterDb();
  const { data, error } = await db
    .from("vanninger")
    .upsert(
      planter.map((plante_id) => ({ plante_id, dato, etterregistrert: dato < idag })),
      { onConflict: "plante_id,dato", ignoreDuplicates: true },
    )
    .select("id");
  if (error) redirect(`${tilbake(formData)}?feil=vann`);

  revalidatePath("/", "layout");
  const nye = (data ?? []).map((r: { id: string }) => r.id);
  const sok = new URLSearchParams();
  if (nye.length > 0) {
    nye.forEach((id) => sok.append("angre", id));
    sok.set("dato", dato);
  } else {
    sok.set("allerede", dato);
  }
  redirect(`${tilbake(formData)}?${sok}`);
}

export async function angre(formData: FormData) {
  const vanninger = ider(formData, "vanning");
  if (vanninger.length > 0) {
    const db = await planterDb();
    await db.from("vanninger").delete().in("id", vanninger);
    revalidatePath("/", "layout");
  }
  redirect(tilbake(formData));
}

export async function fjernVanning(formData: FormData) {
  const [id] = ider(formData, "vanning");
  if (id) {
    const db = await planterDb();
    await db.from("vanninger").delete().eq("id", id);
    revalidatePath("/", "layout");
  }
  redirect(tilbake(formData));
}

export async function leggTil(formData: FormData) {
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  if (!husstand) redirect("/planter");

  const katalogPlante = finnIKatalog(String(formData.get("katalog") ?? ""));
  const gruppe = String(formData.get("gruppe") ?? "middels") as Gruppe;
  const kallenavn = String(formData.get("kallenavn") ?? "").trim();
  const plassering = String(formData.get("plassering") ?? "").trim();

  let navn: string;
  let sommer: number;
  let vinter: number;
  if (katalogPlante) {
    ({ sommer, vinter } = intervaller(katalogPlante));
    navn = kallenavn || katalogPlante.navn;
  } else {
    const g = grupper[gruppe] ?? grupper.middels;
    ({ sommer, vinter } = g);
    navn = kallenavn;
  }
  if (!navn) redirect("/planter/ny?feil=navn");

  const db = supabase.schema("planter");
  const { data, error } = await db
    .from("planter")
    .insert({
      household_id: husstand.id,
      navn: navn.slice(0, 80),
      katalog_id: katalogPlante?.id ?? null,
      plassering: plassering.slice(0, 80) || null,
      sommer_dager: sommer,
      vinter_dager: vinter,
    })
    .select("id")
    .single();
  if (error || !data) redirect("/planter/ny?feil=lagre");

  const sist = String(formData.get("sist") ?? "idag");
  const dagerSiden = sist === "idag" ? 0 : sist === "igaar" ? 1 : null;
  if (dagerSiden !== null) {
    await db.from("vanninger").insert({
      plante_id: data.id,
      dato: leggTilDager(iDag(), -dagerSiden),
      etterregistrert: dagerSiden > 0,
    });
  }

  revalidatePath("/", "layout");
  redirect(`/planter?ny=${data.id}`);
}

export async function endre(formData: FormData) {
  const [id] = ider(formData, "plante");
  if (!id) redirect("/planter");
  const navn = String(formData.get("navn") ?? "").trim().slice(0, 80);
  const plassering = String(formData.get("plassering") ?? "").trim().slice(0, 80);
  const sommer = Math.round(Number(formData.get("sommer")));
  const vinter = Math.round(Number(formData.get("vinter")));
  if (!navn || !(sommer >= 1 && sommer <= 120) || !(vinter >= 1 && vinter <= 180)) {
    redirect(`/planter/${id}/endre?feil=1`);
  }

  const db = await planterDb();
  const { error } = await db
    .from("planter")
    .update({ navn, plassering: plassering || null, sommer_dager: sommer, vinter_dager: vinter })
    .eq("id", id);
  if (error) redirect(`/planter/${id}/endre?feil=1`);

  revalidatePath("/", "layout");
  redirect(`/planter/${id}`);
}

export async function slett(formData: FormData) {
  const [id] = ider(formData, "plante");
  if (id) {
    const db = await planterDb();
    await db.from("planter").delete().eq("id", id);
    revalidatePath("/", "layout");
  }
  redirect("/planter");
}
