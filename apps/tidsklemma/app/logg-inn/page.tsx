import { Skilt } from "../skilt";
import { Innlogging } from "./innlogging";

export default async function LoggInn({
  searchParams,
}: {
  searchParams: Promise<{ sendt?: string; feil?: string }>;
}) {
  const { sendt, feil } = await searchParams;

  return (
    <>
      <Skilt />
      <h1>Tidsklemma</h1>
      <div className="strek" />
      <p className="undertekst">Hjemme-appen</p>
      {sendt ? (
        <div className="bunnknapper">
          <div className="kort">
            <p className="kt">Sjekk e-posten din</p>
            <p>Trykk på lenken i e-posten for å logge inn. Den kan havne i søppelpost.</p>
          </div>
        </div>
      ) : (
        <Innlogging epostFeil={Boolean(feil)} />
      )}
    </>
  );
}
