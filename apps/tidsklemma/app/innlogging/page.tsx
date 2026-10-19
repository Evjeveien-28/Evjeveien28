import Link from "next/link";
import { Passkeys } from "./passkeys";

export default function Innlogging() {
  return (
    <>
      <Link href="/" className="tilbake">
        ← Tilbake
      </Link>
      <h2>Innlogging</h2>
      <div className="strek venstre" />
      <p>
        Passkeys lar deg logge inn med Face ID, fingeravtrykk eller skjermlåsen. Har du mistet en enhet, slett
        passkeyen her. E-postlenken virker alltid.
      </p>
      <Passkeys />
    </>
  );
}
