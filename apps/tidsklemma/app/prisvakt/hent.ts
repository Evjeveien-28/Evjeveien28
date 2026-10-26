/** Leser navn, pris, bilde og strekkode fra en produktside, fra dataene butikkene legger ut for Google (schema.org). */

export type Produkt = {
  navn: string;
  pris: number;
  valuta: string;
  bilde: string | null;
  ean: string | null;
  paLager: boolean | null;
};

type Node = Record<string, unknown>;

const BUTIKKER: Record<string, string> = {
  "obsbygg.no": "Obs Bygg",
  "coop.no": "Coop",
  "maxbo.no": "Maxbo",
  "byggmax.no": "Byggmax",
  "byggmakker.no": "Byggmakker",
  "montera.no": "Montér",
  "ikea.com": "IKEA",
  "jysk.no": "Jysk",
  "bolia.com": "Bolia",
  "skeidar.no": "Skeidar",
  "elkjop.no": "Elkjøp",
  "clasohlson.com": "Clas Ohlson",
  "jula.no": "Jula",
  "biltema.no": "Biltema",
};

/** «Obs Bygg» for www.obsbygg.no, ellers domenet. */
export function butikkNavn(url: string): string {
  const vert = new URL(url).hostname.replace(/^www\./, "");
  const treff = Object.keys(BUTIKKER).find((d) => vert === d || vert.endsWith(`.${d}`));
  return treff ? BUTIKKER[treff]! : vert;
}

function liste<T>(v: T | T[] | undefined | null): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function typer(n: Node): string[] {
  return liste(n["@type"] as string | string[]).map(String);
}

/** Alle objekter i JSON-LD-blokkene, også de som ligger i @graph eller i lister. */
function noder(html: string): Node[] {
  const ut: Node[] = [];
  const besok = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(besok);
    if (v && typeof v === "object") {
      ut.push(v as Node);
      const g = (v as Node)["@graph"];
      if (g) besok(g);
    }
  };
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      besok(JSON.parse(m[1]!.trim()));
    } catch {
      // Ødelagt blokk: hopp over.
    }
  }
  return ut;
}

function tall(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fraTilbud(offers: unknown): { pris: number; valuta: string; paLager: boolean | null } | null {
  for (const o of liste(offers as Node | Node[])) {
    const pris = tall(o.price) ?? tall(o.lowPrice) ?? tall((o.priceSpecification as Node | undefined)?.price);
    if (pris == null) continue;
    const lager = typeof o.availability === "string" ? /InStock|LimitedAvailability|OnlineOnly/i.test(o.availability) : null;
    return { pris, valuta: String(o.priceCurrency ?? "NOK"), paLager: lager };
  }
  return null;
}

function bilde(v: unknown, base: string): string | null {
  const forste = liste(v as unknown[])[0];
  const src = typeof forste === "string" ? forste : ((forste as Node | undefined)?.url as string | undefined);
  if (!src) return null;
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function strekkode(n: Node): string | null {
  for (const felt of ["gtin13", "gtin", "gtin14", "gtin12", "gtin8", "ean"]) {
    const v = String(n[felt] ?? "").replace(/\D/g, "");
    if (/^\d{8,14}$/.test(v)) return v;
  }
  // Obs Bygg/Coop: sku som «ObsBygg-4066529222862».
  const sku = String(n.sku ?? "").match(/(\d{8,14})$/);
  return sku ? sku[1]! : null;
}

function meta(html: string, egenskap: string): string | null {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${egenskap}["'][^>]+content=["']([^"']*)["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${egenskap}["']`, "i"));
  return m ? m[1]!.replace(/&amp;/g, "&").trim() : null;
}

/** Finner produktet i HTML-en. For en produktgruppe velges varianten lenken peker på (f.eks. ?v=…). */
export function lesProdukt(html: string, url: string): Produkt | null {
  const alle = noder(html);
  const produkter = alle.filter((n) => typer(n).some((t) => t === "Product" || t === "ProductGroup"));
  const lenke = new URL(url);

  for (const p of produkter) {
    const varianter = liste(p.hasVariant as Node | Node[]);
    const kandidater = varianter.length ? varianter : [p];
    const valgt =
      kandidater.find((v) => {
        const vurl = String(v.url ?? (v.offers as Node | undefined)?.url ?? "");
        const sku = String(v.sku ?? "");
        return (
          (vurl && vurl.split("#")[0] === lenke.href.split("#")[0]) ||
          (sku && [...lenke.searchParams.values()].includes(sku))
        );
      }) ?? kandidater[0]!;
    const tilbud = fraTilbud(valgt.offers) ?? fraTilbud(p.offers);
    if (!tilbud) continue;
    return {
      navn: String(valgt.name ?? p.name ?? "").trim(),
      pris: tilbud.pris,
      valuta: tilbud.valuta,
      bilde: bilde(valgt.image ?? p.image, url),
      ean: strekkode(valgt) ?? strekkode(p),
      paLager: tilbud.paLager,
    };
  }

  // Reserve: Open Graph / produkt-metatagger.
  const pris = tall(meta(html, "product:price:amount") ?? meta(html, "og:price:amount"));
  const navn = meta(html, "og:title");
  if (pris != null && navn) {
    return {
      navn,
      pris,
      valuta: meta(html, "product:price:currency") ?? "NOK",
      bilde: bilde(meta(html, "og:image"), url),
      ean: null,
      paLager: null,
    };
  }
  return null;
}

/** Henter siden og leser produktet. Gir en feilmelding på norsk hvis det ikke går. */
export async function hentProdukt(url: string): Promise<{ ok: true; produkt: Produkt } | { ok: false; feil: string }> {
  let svar: Response;
  try {
    svar = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Tidsklemma-prisvakt/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, feil: "Fikk ikke kontakt med butikken." };
  }
  if (svar.status === 404 || svar.status === 410) return { ok: false, feil: "Siden finnes ikke lenger." };
  if (!svar.ok) return { ok: false, feil: `Butikken svarte med feil (${svar.status}).` };
  const produkt = lesProdukt(await svar.text(), svar.url || url);
  if (!produkt || !produkt.navn) return { ok: false, feil: "Fant ikke prisen på siden. Butikken støttes kanskje ikke ennå." };
  return { ok: true, produkt };
}
