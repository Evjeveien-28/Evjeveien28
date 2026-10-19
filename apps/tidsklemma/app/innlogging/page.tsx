import { Side } from "../side";
import { Passkeys } from "./passkeys";

export default function Innlogging() {
  return (
    <Side tittel="Innlogging" tilbake={{ href: "/meg", navn: "Meg" }}>
      <p>
        Passkeys lar deg logge inn med Face ID, fingeravtrykk eller skjermlåsen. Har du mistet en enhet, slett
        passkeyen her. E-postlenken virker alltid.
      </p>
      <Passkeys />
    </Side>
  );
}
