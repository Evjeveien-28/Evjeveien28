import { createClient } from "@hjem/db/server";
import { arstid, laerIntervall, velgIntervall, type Arstid, type Intervallvalg } from "./laering";
import { dagerMellom, iDag, leggTilDager } from "./tid";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const PLANTEFELT =
  "id, navn, katalog_id, latinsk_navn, plassering, standard_sommer, standard_vinter, manuelt_sommer, manuelt_vinter, auto_justering";

export type PlanteRad = {
  id: string;
  navn: string;
  katalog_id: string | null;
  latinsk_navn: string | null;
  plassering: string | null;
  standard_sommer: number;
  standard_vinter: number;
  manuelt_sommer: number | null;
  manuelt_vinter: number | null;
  auto_justering: boolean;
};

export type Vanning = {
  id: string;
  dato: string;
  registrert_av: string | null;
  etterregistrert: boolean;
  telles_ikke: boolean;
};

export type PlanteStatus = PlanteRad & {
  /** Intervallvalget for hver årstid. */
  valg: Record<Arstid, Intervallvalg>;
  /** Intervallet som gjelder nå. */
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

/** Husstandens felles bryter for automatisk justering. På hvis den aldri er satt. */
export async function hentAutoJustering(supabase: Supabase, husstandId: string) {
  const { data } = await supabase
    .schema("planter")
    .from("innstillinger")
    .select("auto_justering")
    .eq("household_id", husstandId)
    .maybeSingle();
  return data?.auto_justering ?? true;
}

/** `vanninger` er nyeste først. */
export function beregnStatus(plante: PlanteRad, vanninger: Vanning[], fellesAuto: boolean, idag = iDag()): PlanteStatus {
  const utgangspunkt = {
    sommer: plante.manuelt_sommer ?? plante.standard_sommer,
    vinter: plante.manuelt_vinter ?? plante.standard_vinter,
  };
  const laert = laerIntervall(vanninger, utgangspunkt);
  const auto = fellesAuto && plante.auto_justering;
  const valg = {
    sommer: velgIntervall("sommer", { standard: plante.standard_sommer, manuelt: plante.manuelt_sommer }, laert.sommer, auto),
    vinter: velgIntervall("vinter", { standard: plante.standard_vinter, manuelt: plante.manuelt_vinter }, laert.vinter, auto),
  };
  const intervall = valg[arstid(idag)].dager;
  const sist = vanninger[0];
  const dagerIgjen = sist ? dagerMellom(idag, leggTilDager(sist.dato, intervall)) : 0;
  return {
    ...plante,
    valg,
    intervall,
    sistVannet: sist?.dato ?? null,
    sistVannetAv: sist?.registrert_av ?? null,
    dagerIgjen,
    trengerVann: dagerIgjen <= 0,
  };
}

/** Alle husstandens planter med status, sortert etter hvem som trenger vann først. */
export async function hentPlanter(supabase: Supabase, husstandId: string): Promise<PlanteStatus[]> {
  const [{ data, error }, fellesAuto] = await Promise.all([
    supabase
      .schema("planter")
      .from("planter")
      .select(`${PLANTEFELT}, vanninger(id, dato, registrert_av, etterregistrert, telles_ikke)`)
      .eq("household_id", husstandId)
      .order("dato", { referencedTable: "vanninger", ascending: false })
      // Nok historikk til å lære begge årstider.
      .limit(60, { referencedTable: "vanninger" }),
    hentAutoJustering(supabase, husstandId),
  ]);
  if (error) throw new Error(`Klarte ikke å hente planter: ${error.message}`);

  const idag = iDag();
  return (data as (PlanteRad & { vanninger: Vanning[] })[])
    .map(({ vanninger, ...p }) => beregnStatus(p, vanninger, fellesAuto, idag))
    .sort((a, b) => a.dagerIgjen - b.dagerIgjen || a.navn.localeCompare(b.navn, "nb"));
}

/** Navn å vise for den som vannet: «deg», fornavnet, eller fornavnet gjettet fra e-posten. */
export async function hentNavn(supabase: Supabase, husstandId: string) {
  const [{ data: medlemmer }, { data: meg }] = await Promise.all([
    supabase.rpc("husstandens_medlemmer", { hid: husstandId }),
    supabase.auth.getClaims(),
  ]);
  const minId = meg?.claims.sub;
  const navn = new Map<string, string>();
  for (const m of (medlemmer as { user_id: string; email: string; fornavn?: string | null }[] | null) ?? []) {
    const fraEpost = m.email.split("@")[0]!.split(/[._-]/)[0]!;
    const fornavn = m.fornavn || fraEpost.charAt(0).toUpperCase() + fraEpost.slice(1);
    navn.set(m.user_id, m.user_id === minId ? "deg" : fornavn);
  }
  return (id: string | null) => (id ? (navn.get(id) ?? "en annen") : null);
}
