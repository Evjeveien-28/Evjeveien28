import { createClient } from "@hjem/db/server";
import { dagerMellom, erVinter, iDag, leggTilDager } from "./tid";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PlanteRad = {
  id: string;
  navn: string;
  katalog_id: string | null;
  plassering: string | null;
  sommer_dager: number;
  vinter_dager: number;
};

export type PlanteStatus = PlanteRad & {
  intervall: number;
  sistVannet: string | null;
  sistVannetAv: string | null;
  /** Dager til neste vanning. 0 = i dag, negativt = på overtid. */
  dagerIgjen: number;
  trengerVann: boolean;
};

export async function hentHusstand(supabase: Supabase) {
  const { data } = await supabase.from("households").select("id, name").limit(1);
  return (data?.[0] as { id: string; name: string } | undefined) ?? null;
}

export function beregnStatus(
  plante: PlanteRad,
  sist: { dato: string; registrert_av: string | null } | undefined,
  idag = iDag(),
): PlanteStatus {
  const intervall = erVinter(idag) ? plante.vinter_dager : plante.sommer_dager;
  const dagerIgjen = sist ? dagerMellom(idag, leggTilDager(sist.dato, intervall)) : 0;
  return {
    ...plante,
    intervall,
    sistVannet: sist?.dato ?? null,
    sistVannetAv: sist?.registrert_av ?? null,
    dagerIgjen,
    trengerVann: dagerIgjen <= 0,
  };
}

/** Alle husstandens planter med status, sortert etter hvem som trenger vann først. */
export async function hentPlanter(supabase: Supabase, husstandId: string): Promise<PlanteStatus[]> {
  const { data, error } = await supabase
    .schema("planter")
    .from("planter")
    .select("id, navn, katalog_id, plassering, sommer_dager, vinter_dager, vanninger(dato, registrert_av)")
    .eq("household_id", husstandId)
    .order("dato", { referencedTable: "vanninger", ascending: false })
    .limit(1, { referencedTable: "vanninger" });
  if (error) throw new Error(`Klarte ikke å hente planter: ${error.message}`);

  const idag = iDag();
  return (data as (PlanteRad & { vanninger: { dato: string; registrert_av: string | null }[] })[])
    .map(({ vanninger, ...p }) => beregnStatus(p, vanninger[0], idag))
    .sort((a, b) => a.dagerIgjen - b.dagerIgjen || a.navn.localeCompare(b.navn, "nb"));
}

/** Navn å vise for den som vannet: «deg», eller fornavnet fra e-posten. */
export async function hentNavn(supabase: Supabase, husstandId: string) {
  const [{ data: medlemmer }, { data: meg }] = await Promise.all([
    supabase.rpc("husstandens_medlemmer", { hid: husstandId }),
    supabase.auth.getClaims(),
  ]);
  const minId = meg?.claims.sub;
  const navn = new Map<string, string>();
  for (const m of (medlemmer as { user_id: string; email: string }[] | null) ?? []) {
    const forste = m.email.split("@")[0]!.split(/[._-]/)[0]!;
    navn.set(m.user_id, m.user_id === minId ? "deg" : forste.charAt(0).toUpperCase() + forste.slice(1));
  }
  return (id: string | null) => (id ? (navn.get(id) ?? "en annen") : null);
}
