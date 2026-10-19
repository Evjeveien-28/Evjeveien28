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
  return /^\/planter(\/[0-9a-f-]{36}|\/innstillinger)?$/.test(sti) ? sti : "/planter";
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

  // Gjenkjent fra bilde, men ikke i listen: latinsk navn, og eventuelt en plante i samme slekt å låne intervall fra.
  const latin = String(formData.get("latin") ?? "").trim().slice(0, 120);
  const lik = katalogPlante ? undefined : finnIKatalog(String(formData.get("lik") ?? ""));

  let navn: string;
  let sommer: number;
  let vinter: number;
  if (katalogPlante) {
    ({ sommer, vinter } = intervaller(katalogPlante));
    navn = kallenavn || katalogPlante.navn;
  } else if (lik) {
    ({ sommer, vinter } = intervaller(lik));
    navn = kallenavn || latin;
  } else {
    const g = grupper[gruppe] ?? grupper.middels;
    ({ sommer, vinter } = g);
    navn = kallenavn || latin;
  }
  if (!navn) redirect("/planter/ny?feil=navn");
  // «Annen plante» kan få egne dager med en gang, f.eks. et juletre som skal vannes hver dag.
  const egne = katalogPlante ? null : dagerEllerNull(formData, "dager", 120);
  if (Number.isNaN(egne)) redirect("/planter/ny?feil=dager");

  const db = supabase.schema("planter");
  const { data, error } = await db
    .from("planter")
    .insert({
      household_id: husstand.id,
      navn: navn.slice(0, 80),
      katalog_id: katalogPlante?.id ?? null,
      latinsk_navn: katalogPlante ? null : latin || null,
      plassering: plassering.slice(0, 80) || null,
      standard_sommer: sommer,
      standard_vinter: vinter,
      ...(egne ? { manuelt_sommer: egne, manuelt_vinter: egne, auto_justering: false } : {}),
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

/** Tomt felt betyr «ikke satt». */
function dagerEllerNull(formData: FormData, felt: string, maks: number) {
  const tekst = String(formData.get(felt) ?? "").trim();
  if (!tekst) return null;
  const n = Math.round(Number(tekst));
  return n >= 1 && n <= maks ? n : NaN;
}

export async function endre(formData: FormData) {
  const [id] = ider(formData, "plante");
  if (!id) redirect("/planter");
  const navn = String(formData.get("navn") ?? "").trim().slice(0, 80);
  const plassering = String(formData.get("plassering") ?? "").trim().slice(0, 80);
  const sommer = dagerEllerNull(formData, "sommer", 120);
  const vinter = dagerEllerNull(formData, "vinter", 180);
  if (!navn || Number.isNaN(sommer) || Number.isNaN(vinter)) redirect(`/planter/${id}/endre?feil=1`);

  const endring: Record<string, unknown> = { navn, plassering: plassering || null, manuelt_sommer: sommer, manuelt_vinter: vinter };
  // Spørsmålet «Slå av automatisk justering?» vises bare når den er på og du setter egne verdier.
  const auto = formData.get("auto");
  if (auto === "av" && (sommer !== null || vinter !== null)) endring.auto_justering = false;

  const db = await planterDb();
  const { error } = await db.from("planter").update(endring).eq("id", id);
  if (error) redirect(`/planter/${id}/endre?feil=1`);

  revalidatePath("/", "layout");
  redirect(`/planter/${id}`);
}

/** Fjern egne verdier og slå av læring, så standardforslaget brukes. */
export async function tilbakestill(formData: FormData) {
  const [id] = ider(formData, "plante");
  if (!id) redirect("/planter");
  const db = await planterDb();
  await db.from("planter").update({ manuelt_sommer: null, manuelt_vinter: null, auto_justering: false }).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/planter/${id}`);
}

export async function settAuto(formData: FormData) {
  const [id] = ider(formData, "plante");
  if (!id) redirect("/planter");
  const db = await planterDb();
  await db.from("planter").update({ auto_justering: formData.get("pa") === "1" }).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/planter/${id}`);
}

export async function settFellesAuto(formData: FormData) {
  const supabase = await createClient();
  const husstand = await hentHusstand(supabase);
  if (husstand) {
    await supabase
      .schema("planter")
      .from("innstillinger")
      .upsert({ household_id: husstand.id, auto_justering: formData.get("pa") === "1", updated_at: new Date().toISOString() });
    revalidatePath("/", "layout");
  }
  redirect("/planter/innstillinger");
}

/** Hold en vanning utenfor (eller ta den med igjen) når intervallet læres. */
export async function tellesIkke(formData: FormData) {
  const [id] = ider(formData, "vanning");
  if (id) {
    const db = await planterDb();
    await db.from("vanninger").update({ telles_ikke: formData.get("verdi") === "1" }).eq("id", id);
    revalidatePath("/", "layout");
  }
  redirect(tilbake(formData));
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
