/** Vises når plantene ikke kan hentes, med Supabase sin feilmelding og hva som pleier å være årsaken. */
export function DatabaseFeil({ melding }: { melding: string }) {
  const m = melding.toLowerCase();
  let hint = "Sjekk at SQL-filene i supabase/migrations er kjørt i Supabase SQL Editor, i rekkefølge.";
  if (m.includes("schema") && (m.includes("must be one of") || m.includes("invalid schema")))
    hint = "Schemaet «planter» er ikke lagt til under Integrations → Data API → Settings → Exposed schemas i Supabase.";
  else if (m.includes("does not exist") && m.includes("column"))
    hint = "En kolonne mangler. Kjør den nyeste SQL-filen for planter i Supabase SQL Editor.";
  else if (m.includes("does not exist") || m.includes("could not find"))
    hint = "Supabase finner ikke tabellene. Slå på planter-tabellene under Integrations → Data API → Settings → Exposed tables, eller kjør SQL-filene hvis de ikke er kjørt.";
  else if (m.includes("permission denied"))
    hint = "Supabase nekter tilgang. Sjekk at hele SQL-filen for planter ble kjørt, også linjene med «grant».";

  return (
    <div className="kort stiplet">
      <p className="kt">Klarte ikke å hente plantene</p>
      <p>{hint}</p>
      <p className="dempet liten">Svar fra Supabase: {melding}</p>
    </div>
  );
}
