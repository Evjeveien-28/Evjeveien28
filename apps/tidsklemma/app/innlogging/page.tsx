import Link from "next/link";
import { Passkeys } from "./passkeys";

export default function Innlogging() {
  return (
    <main>
      <p>
        <Link href="/">← Tilbake</Link>
      </p>
      <h1>Innlogging</h1>
      <p>
        Passkeys lar deg logge inn med Face ID, fingeravtrykk eller skjermlåsen. Har du mistet en enhet, slett
        passkeyen her. E-postlenken virker alltid.
      </p>
      <Passkeys />
    </main>
  );
}
