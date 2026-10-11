import { Card } from "@hjem/ui";

const ukedager = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

export default function Home() {
  return (
    <main>
      <h1>Middagsplanlegger</h1>
      <p>Ukens middager. Koblingen til Supabase kommer i neste steg.</p>
      {ukedager.map((dag) => (
        <Card key={dag} title={dag}>
          <p style={{ margin: 0, color: "#888" }}>Ingen middag planlagt</p>
        </Card>
      ))}
    </main>
  );
}
