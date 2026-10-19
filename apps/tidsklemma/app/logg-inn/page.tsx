import { loggInn } from "../actions";
import { PasskeyKnapp } from "./passkey-knapp";

export default async function LoggInn({
  searchParams,
}: {
  searchParams: Promise<{ sendt?: string; feil?: string }>;
}) {
  const { sendt, feil } = await searchParams;

  return (
    <main>
      <h1>Tidsklemma</h1>
      {sendt ? (
        <p>Sjekk e-posten din. Trykk på lenken for å logge inn.</p>
      ) : (
        <>
          <PasskeyKnapp />
          <form action={loggInn} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor="email">E-post</label>
          <input id="email" name="email" type="email" required autoComplete="email" style={{ padding: 12, fontSize: 16 }} />
          <button type="submit" style={{ padding: 12, fontSize: 16 }}>
            Send innloggingslenke
          </button>
          {feil && <p style={{ color: "#b91c1c" }}>Det gikk ikke. Sjekk adressen og prøv igjen.</p>}
          </form>
        </>
      )}
    </main>
  );
}
