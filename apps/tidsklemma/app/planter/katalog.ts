/**
 * Planteliste med vanlige stueplanter og omtrentlig vanningsintervall i dager.
 * Tallene er tommelfingerregler og heller litt for sjelden enn for ofte: for mye vann tar livet av flere
 * stueplanter enn for lite. Vinter gjelder oktober–mars. Hver plante kan justeres i appen.
 */

export type Gruppe = "kaktus" | "sukkulent" | "torke" | "middels" | "fuktig" | "torst" | "orkide";

export const grupper: Record<Gruppe, { navn: string; sommer: number; vinter: number; tips: string }> = {
  kaktus: { navn: "Kaktus", sommer: 18, vinter: 35, tips: "La jorda tørke helt ut mellom hver vanning. Om vinteren nesten ikke vann." },
  sukkulent: { navn: "Sukkulent", sommer: 12, vinter: 24, tips: "Vann grundig, og la jorda tørke helt før neste gang." },
  torke: { navn: "Tåler tørke", sommer: 16, vinter: 30, tips: "Tåler å bli glemt. Vann når jorda er tørr helt ned." },
  middels: { navn: "Middels", sommer: 8, vinter: 14, tips: "Kjenn på jorda først: er den tørr 2–3 cm ned, er det tid." },
  fuktig: { navn: "Liker fuktig", sommer: 6, vinter: 9, tips: "Liker jevnt fuktig jord, men ikke stående vann i potten." },
  torst: { navn: "Svært tørst", sommer: 4, vinter: 6, tips: "Skal aldri tørke helt ut. Liker også å bli dusjet." },
  orkide: { navn: "Orkidé", sommer: 9, vinter: 14, tips: "Dypp potten i vann i 10 minutter og la den renne godt av. Røttene skal bli grå mellom hver gang." },
};

export type KatalogPlante = {
  id: string;
  navn: string;
  latin: string;
  /** Andre navn folk søker på. */
  ogsa?: string[];
  /** Andre latinske navn arten har hatt, så bildegjenkjenning treffer. */
  synonymer?: string[];
  slekt: string | null;
  familie: string;
  gruppe: Gruppe;
  sommer?: number;
  vinter?: number;
  tips?: string;
};

export const katalog: KatalogPlante[] = [
  { id: "monstera", navn: "Monstera", latin: "Monstera deliciosa", ogsa: ["Vindusblad", "Hullplante"], slekt: "Monstera", familie: "Araceae", gruppe: "middels" },
  { id: "hullmonstera", navn: "Hullmonstera", latin: "Monstera adansonii", ogsa: ["Monkey mask"], slekt: "Monstera", familie: "Araceae", gruppe: "middels", sommer: 7, vinter: 12 },
  { id: "gullranke", navn: "Gullranke", latin: "Epipremnum aureum", synonymer: ["Scindapsus aureus", "Epipremnum pinnatum"], ogsa: ["Pothos"], slekt: "Epipremnum", familie: "Araceae", gruppe: "middels" },
  { id: "solvranke", navn: "Sølvranke", latin: "Scindapsus pictus", ogsa: ["Satin pothos"], slekt: "Scindapsus", familie: "Araceae", gruppe: "middels" },
  { id: "klatrefilodendron", navn: "Klatrefilodendron", latin: "Philodendron hederaceum", ogsa: ["Hjertefilodendron", "Filodendron"], slekt: "Philodendron", familie: "Araceae", gruppe: "middels", sommer: 7, vinter: 12 },
  { id: "fredslilje", navn: "Fredslilje", latin: "Spathiphyllum wallisii", slekt: "Spathiphyllum", familie: "Araceae", gruppe: "fuktig", sommer: 5, vinter: 9, tips: "Henger med bladene når den er tørst, og retter seg opp igjen etter vanning." },
  { id: "zamioculcas", navn: "Zamioculcas", latin: "Zamioculcas zamiifolia", ogsa: ["ZZ-plante", "Smaragdpalme"], slekt: "Zamioculcas", familie: "Araceae", gruppe: "torke", sommer: 18 },
  { id: "elefantore", navn: "Elefantøre", latin: "Alocasia", ogsa: ["Alocasia"], slekt: "Alocasia", familie: "Araceae", gruppe: "fuktig", vinter: 10 },
  { id: "dieffenbachia", navn: "Dieffenbachia", latin: "Dieffenbachia seguine", slekt: "Dieffenbachia", familie: "Araceae", gruppe: "middels", sommer: 7, vinter: 12 },
  { id: "aglaonema", navn: "Aglaonema", latin: "Aglaonema commutatum", ogsa: ["Kinesisk eviggrønn"], slekt: "Aglaonema", familie: "Araceae", gruppe: "middels" },
  { id: "flamingoblomst", navn: "Flamingoblomst", latin: "Anthurium andraeanum", ogsa: ["Anthurium"], slekt: "Anthurium", familie: "Araceae", gruppe: "middels", sommer: 7, vinter: 12 },

  { id: "svigermors-tunge", navn: "Svigermors tunge", latin: "Dracaena trifasciata", synonymer: ["Sansevieria trifasciata"], ogsa: ["Sansevieria", "Bajonettplante"], slekt: "Dracaena", familie: "Asparagaceae", gruppe: "torke", sommer: 18 },
  { id: "dragetre", navn: "Dragetre", latin: "Dracaena marginata", ogsa: ["Dracaena"], slekt: "Dracaena", familie: "Asparagaceae", gruppe: "middels", sommer: 10, vinter: 18 },
  { id: "graslilje", navn: "Graslilje", latin: "Chlorophytum comosum", ogsa: ["Edderkoppplante"], slekt: "Chlorophytum", familie: "Asparagaceae", gruppe: "middels", sommer: 7, vinter: 12 },
  { id: "palmelilje", navn: "Palmelilje", latin: "Yucca elephantipes", synonymer: ["Yucca gigantea"], ogsa: ["Yucca"], slekt: "Yucca", familie: "Asparagaceae", gruppe: "torke", sommer: 12, vinter: 24 },
  { id: "elefantfot", navn: "Elefantfot", latin: "Beaucarnea recurvata", ogsa: ["Hestehaleplante"], slekt: "Beaucarnea", familie: "Asparagaceae", gruppe: "torke", sommer: 18, vinter: 35 },

  { id: "fiolinfiken", navn: "Fiolinfiken", latin: "Ficus lyrata", slekt: "Ficus", familie: "Moraceae", gruppe: "middels" },
  { id: "gummifiken", navn: "Gummifiken", latin: "Ficus elastica", ogsa: ["Gummitre"], slekt: "Ficus", familie: "Moraceae", gruppe: "middels", sommer: 10, vinter: 16 },
  { id: "benjaminfiken", navn: "Benjaminfiken", latin: "Ficus benjamina", ogsa: ["Hengefiken"], slekt: "Ficus", familie: "Moraceae", gruppe: "middels", sommer: 7, vinter: 12, tips: "Liker ikke å bli flyttet. Kaster blader ved trekk eller lysendring." },

  { id: "paraplytre", navn: "Paraplytre", latin: "Schefflera arboricola", synonymer: ["Heptapleurum arboricola"], ogsa: ["Schefflera"], slekt: "Schefflera", familie: "Araliaceae", gruppe: "middels" },
  { id: "efoy", navn: "Eføy", latin: "Hedera helix", slekt: "Hedera", familie: "Araliaceae", gruppe: "middels", sommer: 6, vinter: 10 },

  { id: "aloe-vera", navn: "Aloe vera", latin: "Aloe vera", ogsa: ["Aloe"], slekt: "Aloe", familie: "Asphodelaceae", gruppe: "sukkulent", sommer: 14, vinter: 28 },
  { id: "pengetre", navn: "Pengetre", latin: "Crassula ovata", ogsa: ["Jadeplante", "Crassula"], slekt: "Crassula", familie: "Crassulaceae", gruppe: "sukkulent" },
  { id: "echeveria", navn: "Echeveria", latin: "Echeveria", ogsa: ["Rosettsukkulent"], slekt: "Echeveria", familie: "Crassulaceae", gruppe: "sukkulent" },
  { id: "kalanchoe", navn: "Kalanchoe", latin: "Kalanchoe blossfeldiana", ogsa: ["Flammende Katie"], slekt: "Kalanchoe", familie: "Crassulaceae", gruppe: "sukkulent", sommer: 10, vinter: 18 },
  { id: "perlekjede", navn: "Perlekjede", latin: "Curio rowleyanus", synonymer: ["Senecio rowleyanus"], ogsa: ["Senecio", "String of pearls"], slekt: "Curio", familie: "Asteraceae", gruppe: "sukkulent", vinter: 21 },
  { id: "voksblomst", navn: "Voksblomst", latin: "Hoya carnosa", ogsa: ["Hoya"], slekt: "Hoya", familie: "Apocynaceae", gruppe: "torke", sommer: 12, vinter: 21 },
  { id: "peperomia", navn: "Peperomia", latin: "Peperomia obtusifolia", ogsa: ["Gummiplante"], slekt: "Peperomia", familie: "Piperaceae", gruppe: "torke", sommer: 10, vinter: 18 },

  { id: "kaktus", navn: "Kaktus", latin: "Cactaceae", ogsa: ["Kaktus (annen)"], slekt: null, familie: "Cactaceae", gruppe: "kaktus" },
  { id: "julekaktus", navn: "Julekaktus", latin: "Schlumbergera", synonymer: ["Schlumbergera truncata", "Schlumbergera × buckleyi"], slekt: "Schlumbergera", familie: "Cactaceae", gruppe: "middels", sommer: 7, vinter: 12, tips: "Unntaket blant kaktusene: vil ikke tørke helt ut, særlig ikke mens den blomstrer." },

  { id: "orkide", navn: "Orkidé", latin: "Phalaenopsis", ogsa: ["Sommerfuglorkidé", "Phalaenopsis"], slekt: "Phalaenopsis", familie: "Orchidaceae", gruppe: "orkide" },

  { id: "calathea", navn: "Calathea", latin: "Goeppertia", synonymer: ["Calathea"], ogsa: ["Kurvmarante"], slekt: "Goeppertia", familie: "Marantaceae", gruppe: "fuktig", tips: "Liker romtemperert vann og høy luftfuktighet. Brune bladkanter betyr for tørr luft." },
  { id: "maranta", navn: "Bønneplante", latin: "Maranta leuconeura", ogsa: ["Maranta"], slekt: "Maranta", familie: "Marantaceae", gruppe: "fuktig" },

  { id: "sverdbregne", navn: "Sverdbregne", latin: "Nephrolepis exaltata", ogsa: ["Bregne", "Bostonbregne"], slekt: "Nephrolepis", familie: "Nephrolepidaceae", gruppe: "torst" },
  { id: "venushar", navn: "Venushår", latin: "Adiantum raddianum", ogsa: ["Bregne", "Adiantum"], slekt: "Adiantum", familie: "Pteridaceae", gruppe: "torst", sommer: 3, vinter: 5 },
  { id: "nettblad", navn: "Nettblad", latin: "Fittonia albivenis", ogsa: ["Fittonia"], slekt: "Fittonia", familie: "Acanthaceae", gruppe: "torst" },

  { id: "pannekakeplante", navn: "Pannekakeplante", latin: "Pilea peperomioides", ogsa: ["Pilea", "Kinesisk pengeplante"], slekt: "Pilea", familie: "Urticaceae", gruppe: "middels", sommer: 7, vinter: 12 },
  { id: "begonia", navn: "Begonia", latin: "Begonia", slekt: "Begonia", familie: "Begoniaceae", gruppe: "middels", sommer: 6, vinter: 10 },
  { id: "tradescantia", navn: "Tradescantia", latin: "Tradescantia zebrina", ogsa: ["Vandrende jøde", "Sebraplante"], slekt: "Tradescantia", familie: "Commelinaceae", gruppe: "middels", sommer: 6, vinter: 10 },
  { id: "usambarafiol", navn: "Usambarafiol", latin: "Saintpaulia ionantha", ogsa: ["Saintpaulia", "Afrikansk fiol"], slekt: "Saintpaulia", familie: "Gesneriaceae", gruppe: "middels", sommer: 6, vinter: 9, tips: "Vann nedenfra eller ved jorda. Vann på bladene gir flekker." },
  { id: "alpefiol", navn: "Alpefiol", latin: "Cyclamen persicum", ogsa: ["Cyclamen"], slekt: "Cyclamen", familie: "Primulaceae", gruppe: "fuktig", sommer: 5, vinter: 7, tips: "Vann nedenfra, ikke midt i knollen." },
  { id: "julestjerne", navn: "Julestjerne", latin: "Euphorbia pulcherrima", slekt: "Euphorbia", familie: "Euphorbiaceae", gruppe: "middels", sommer: 6, vinter: 8 },
  { id: "kroton", navn: "Kroton", latin: "Codiaeum variegatum", slekt: "Codiaeum", familie: "Euphorbiaceae", gruppe: "fuktig", vinter: 10 },
  { id: "hibiskus", navn: "Hibiskus", latin: "Hibiscus rosa-sinensis", ogsa: ["Kinarose"], slekt: "Hibiscus", familie: "Malvaceae", gruppe: "fuktig", sommer: 4, vinter: 7 },

  { id: "kentiapalme", navn: "Kentiapalme", latin: "Howea forsteriana", ogsa: ["Palme"], slekt: "Howea", familie: "Arecaceae", gruppe: "middels" },
  { id: "gullpalme", navn: "Gullpalme", latin: "Dypsis lutescens", ogsa: ["Arecapalme", "Palme"], slekt: "Dypsis", familie: "Arecaceae", gruppe: "middels", sommer: 6, vinter: 10 },
  { id: "dvergpalme", navn: "Dvergpalme", latin: "Chamaedorea elegans", ogsa: ["Stuepalme", "Palme"], slekt: "Chamaedorea", familie: "Arecaceae", gruppe: "middels", sommer: 7, vinter: 12 },
  { id: "paradisfugl", navn: "Paradisfugl", latin: "Strelitzia nicolai", synonymer: ["Strelitzia reginae"], ogsa: ["Strelitzia", "Paradisfuglblomst"], slekt: "Strelitzia", familie: "Strelitziaceae", gruppe: "middels" },

  { id: "oliventre", navn: "Oliventre", latin: "Olea europaea", ogsa: ["Oliven"], slekt: "Olea", familie: "Oleaceae", gruppe: "middels" },
  { id: "sitrontre", navn: "Sitrontre", latin: "Citrus limon", ogsa: ["Sitrus", "Citrus"], slekt: "Citrus", familie: "Rutaceae", gruppe: "middels", sommer: 6, vinter: 10 },
  { id: "juletre", navn: "Juletre", latin: "Abies nordmanniana", ogsa: ["Nordmannsgran", "Gran", "Edelgran"], synonymer: ["Picea abies", "Abies"], slekt: "Abies", familie: "Pinaceae", gruppe: "torst", sommer: 1, vinter: 1, tips: "Sjekk vannet i juletrefoten hver dag. Et nytt tre kan drikke flere liter i døgnet." },
  { id: "basilikum", navn: "Basilikum", latin: "Ocimum basilicum", ogsa: ["Urter"], slekt: "Ocimum", familie: "Lamiaceae", gruppe: "torst", sommer: 3, vinter: 4 },
];

export function finnIKatalog(id: string | null | undefined) {
  return id ? katalog.find((p) => p.id === id) : undefined;
}

/** Intervallene for en plante i listen, med gruppens verdier der planten ikke har egne. */
export function intervaller(plante: KatalogPlante) {
  const g = grupper[plante.gruppe];
  return { sommer: plante.sommer ?? g.sommer, vinter: plante.vinter ?? g.vinter, tips: plante.tips ?? g.tips };
}

/** Søk i navn, andre navn og latinsk navn. Treff i starten av det norske navnet kommer først. */
export function sok(tekst: string) {
  const q = tekst.trim().toLowerCase();
  if (!q) return [];
  const poeng = (p: KatalogPlante) => {
    if (p.navn.toLowerCase().startsWith(q)) return 3;
    const navn = [p.navn, ...(p.ogsa ?? []), p.latin].map((n) => n.toLowerCase());
    if (navn.some((n) => n.startsWith(q))) return 2;
    if (navn.some((n) => n.split(/[\s-]+/).some((ord) => ord.startsWith(q)))) return 1;
    if (navn.some((n) => n.includes(q))) return 0.5;
    return 0;
  };
  return katalog
    .map((p) => ({ p, s: poeng(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.navn.localeCompare(b.p.navn, "nb"))
    .map((x) => x.p);
}

/** Gruppe for plantefamilier, brukt når verken art eller slekt finnes i listen. */
const familiegrupper: Record<string, Gruppe> = {
  Cactaceae: "kaktus",
  Crassulaceae: "sukkulent",
  Asphodelaceae: "sukkulent",
  Aizoaceae: "sukkulent",
  Asparagaceae: "torke",
  Bromeliaceae: "torke",
  Piperaceae: "torke",
  Apocynaceae: "torke",
  Araceae: "middels",
  Arecaceae: "middels",
  Moraceae: "middels",
  Araliaceae: "middels",
  Begoniaceae: "middels",
  Gesneriaceae: "middels",
  Euphorbiaceae: "middels",
  Urticaceae: "middels",
  Commelinaceae: "middels",
  Rutaceae: "middels",
  Strelitziaceae: "middels",
  Oleaceae: "middels",
  Marantaceae: "fuktig",
  Primulaceae: "fuktig",
  Malvaceae: "fuktig",
  Orchidaceae: "orkide",
  Nephrolepidaceae: "torst",
  Pteridaceae: "torst",
  Polypodiaceae: "torst",
  Aspleniaceae: "torst",
  Davalliaceae: "torst",
  Acanthaceae: "torst",
  Lamiaceae: "torst",
};

export type Treff =
  | { type: "art"; plante: KatalogPlante }
  | { type: "slekt"; plante: KatalogPlante }
  | { type: "familie"; gruppe: Gruppe }
  | { type: "ukjent" };

const norm = (tekst: string) => tekst.toLowerCase().replace(/\s+/g, " ").trim();
/** «Monstera deliciosa Liebm.» → «monstera deliciosa». */
const toOrd = (tekst: string) => norm(tekst).split(" ").slice(0, 2).join(" ");

/** Finner nærmeste plante i listen for en art fra bildegjenkjenning: art, så slekt, så familie. */
export function finnTreff({ latin, slekt, familie }: { latin: string; slekt?: string; familie?: string }): Treff {
  const art = toOrd(latin);
  const s = slekt ? norm(slekt) : art.split(" ")[0]!;
  const f = familie ? norm(familie) : "";
  const latinske = (p: KatalogPlante) => [p.latin, ...(p.synonymer ?? [])].map(norm);

  // Hele arten, eller en oppføring i listen som gjelder hele slekten eller familien (f.eks. «Phalaenopsis», «Cactaceae»).
  const eksakt =
    katalog.find((p) => latinske(p).some((l) => toOrd(l) === art)) ??
    katalog.find((p) => latinske(p).some((l) => !l.includes(" ") && (l === s || l === f)));
  if (eksakt) return { type: "art", plante: eksakt };

  const sammeSlekt = katalog.find((p) => p.slekt && norm(p.slekt) === s);
  if (sammeSlekt) return { type: "slekt", plante: sammeSlekt };

  const gruppe = familie ? familiegrupper[familie.trim()] : undefined;
  if (gruppe) return { type: "familie", gruppe };
  return { type: "ukjent" };
}
