import { Innlogging } from "./innlogging";

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
        <Innlogging epostFeil={Boolean(feil)} />
      )}
    </main>
  );
}
