import type { Forslag } from "../gjenkjenn/route";

const MAKS_SIDE = 1280;

/** Krymper bildet på telefonen før det sendes, så det går raskt og holder seg under grensen. */
async function krymp(fil: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(fil);
    const skala = Math.min(1, MAKS_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * skala);
    canvas.height = Math.round(bitmap.height * skala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (blob) return blob;
  } catch {
    // Faller tilbake til originalen.
  }
  return fil;
}

export async function gjenkjenn(fil: File): Promise<{ forslag: Forslag[] } | { feil: string }> {
  const skjema = new FormData();
  skjema.append("bilde", await krymp(fil), "plante.jpg");
  try {
    const svar = await fetch("/planter/gjenkjenn", { method: "POST", body: skjema });
    const data = await svar.json().catch(() => ({ feil: "ukjent" }));
    return svar.ok ? data : { feil: data.feil ?? "ukjent" };
  } catch {
    return { feil: "nett" };
  }
}
