"use client";

/** Hjelpefunksjoner for passkeys (Face ID, fingeravtrykk, skjermlås). */

const NOKKEL = "tidsklemma.passkey";

/** Har denne enheten innebygd biometri eller skjermlås som kan brukes til passkeys? */
export async function enhetenStotterPasskey(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Om brukeren har lagt til en passkey ("ja") eller takket nei ("nei") på denne enheten. */
export function hentValg(): "ja" | "nei" | null {
  try {
    const verdi = localStorage.getItem(NOKKEL);
    return verdi === "ja" || verdi === "nei" ? verdi : null;
  } catch {
    return null;
  }
}

export function lagreValg(verdi: "ja" | "nei" | null) {
  try {
    if (verdi) localStorage.setItem(NOKKEL, verdi);
    else localStorage.removeItem(NOKKEL);
  } catch {
    // Privat nettleservindu e.l. – da spør vi bare igjen neste gang.
  }
}

/** Brukeren lukket Face ID-/fingeravtrykk-dialogen selv. Det er ikke en feil. */
export function erAvbrutt(error: unknown): boolean {
  const e = error as { name?: string; code?: string; cause?: { name?: string } } | null;
  return (
    e?.name === "NotAllowedError" ||
    e?.name === "AbortError" ||
    e?.cause?.name === "NotAllowedError" ||
    e?.code === "ERROR_CEREMONY_ABORTED"
  );
}
