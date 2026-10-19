import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@hjem/db/server";
import { finnTreff, intervaller, grupper, type Treff } from "../katalog";

/** Ett forslag fra bildegjenkjenningen, koblet til plantelisten i appen. */
export type Forslag = {
  latin: string;
  slekt: string | null;
  familie: string | null;
  sikkerhet: number;
  vanligeNavn: string[];
  bilde: { url: string; kreditt: string } | null;
  treff: Treff;
  /** Intervall som vil bli brukt (sommer/vinter), for visning. */
  sommer: number;
  vinter: number;
};

const MAKS_BYTES = 4 * 1024 * 1024;

type Navn = string | { scientificNameWithoutAuthor?: string; scientificName?: string } | undefined;
const navnFra = (n: Navn) => (typeof n === "string" ? n : (n?.scientificNameWithoutAuthor ?? n?.scientificName ?? null));

type PlantnetBilde = { url?: { o?: string; m?: string; s?: string } | string; author?: string; license?: string; citation?: string };
type PlantnetResultat = {
  score?: number;
  species?: {
    scientificNameWithoutAuthor?: string;
    scientificName?: string;
    genus?: Navn;
    family?: Navn;
    commonNames?: string[];
  };
  images?: PlantnetBilde[];
};

function bildeFra(bilder: PlantnetBilde[] | undefined) {
  const b = bilder?.[0];
  if (!b?.url) return null;
  const url = typeof b.url === "string" ? b.url : (b.url.m ?? b.url.s ?? b.url.o);
  if (!url || !url.startsWith("https://")) return null;
  return { url, kreditt: [b.author, b.license].filter(Boolean).join(" · ") || "Pl@ntNet" };
}

/** Tar imot ett bilde, spør Pl@ntNet og returnerer de tre mest sannsynlige plantene. */
export async function POST(request: NextRequest) {
  // Nøkkelen er husstandens. Bare innloggede får bruke den.
  const supabase = await createClient();
  const { data: meg } = await supabase.auth.getClaims();
  if (!meg?.claims) return NextResponse.json({ feil: "ikke-innlogget" }, { status: 401 });

  const nokkel = process.env.PLANTNET_API_KEY;
  if (!nokkel) return NextResponse.json({ feil: "ikke-satt-opp" }, { status: 503 });

  const skjema = await request.formData().catch(() => null);
  const bilde = skjema?.get("bilde");
  if (!(bilde instanceof Blob) || bilde.size === 0) return NextResponse.json({ feil: "mangler-bilde" }, { status: 400 });
  if (bilde.size > MAKS_BYTES) return NextResponse.json({ feil: "for-stort" }, { status: 413 });
  if (!["image/jpeg", "image/png"].includes(bilde.type)) return NextResponse.json({ feil: "feil-format" }, { status: 415 });

  const ut = new FormData();
  ut.append("images", bilde, "plante.jpg");
  ut.append("organs", "auto");

  const base = process.env.PLANTNET_API_URL ?? "https://my-api.plantnet.org";
  const url = new URL("/v2/identify/all", base);
  url.searchParams.set("api-key", nokkel);
  url.searchParams.set("include-related-images", "true");
  url.searchParams.set("nb-results", "3");
  url.searchParams.set("lang", "en");

  let svar: Response;
  try {
    svar = await fetch(url, { method: "POST", body: ut, signal: AbortSignal.timeout(20_000) });
  } catch {
    return NextResponse.json({ feil: "utilgjengelig" }, { status: 502 });
  }
  // Pl@ntNet svarer 404 når den ikke fant noen plante i bildet.
  if (svar.status === 404) return NextResponse.json({ forslag: [] });
  if (svar.status === 429) return NextResponse.json({ feil: "kvote" }, { status: 429 });
  if (!svar.ok) return NextResponse.json({ feil: "utilgjengelig" }, { status: 502 });

  const data = (await svar.json().catch(() => null)) as { results?: PlantnetResultat[] } | null;
  const forslag: Forslag[] = (data?.results ?? [])
    .slice(0, 3)
    .map((r) => {
      const latin = r.species?.scientificNameWithoutAuthor ?? r.species?.scientificName ?? "";
      const slekt = navnFra(r.species?.genus);
      const familie = navnFra(r.species?.family);
      const treff = finnTreff({ latin, slekt: slekt ?? undefined, familie: familie ?? undefined });
      const iv =
        treff.type === "art" || treff.type === "slekt"
          ? intervaller(treff.plante)
          : grupper[treff.type === "familie" ? treff.gruppe : "middels"];
      return {
        latin,
        slekt,
        familie,
        sikkerhet: Math.round((r.score ?? 0) * 100),
        vanligeNavn: (r.species?.commonNames ?? []).slice(0, 3),
        bilde: bildeFra(r.images),
        treff,
        sommer: iv.sommer,
        vinter: iv.vinter,
      };
    })
    .filter((f) => f.latin);

  return NextResponse.json({ forslag });
}
