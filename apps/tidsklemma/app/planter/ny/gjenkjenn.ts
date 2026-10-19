import type { Forslag } from "../gjenkjenn/route";

const MAKS_SIDE = 1280;
const NOKKEL = "tidsklemma.nyttPlantebilde";

/** Krymper bildet på telefonen før det sendes, så det går raskt og holder seg under grensen. */
export async function krymp(fil: Blob): Promise<Blob> {
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

export async function gjenkjenn(bilde: Blob): Promise<{ forslag: Forslag[] } | { feil: string }> {
  const skjema = new FormData();
  skjema.append("bilde", bilde, "plante.jpg");
  try {
    const svar = await fetch("/planter/gjenkjenn", { method: "POST", body: skjema });
    const data = await svar.json().catch(() => ({ feil: "ukjent" }));
    return svar.ok ? data : { feil: data.feil ?? "ukjent" };
  } catch {
    return { feil: "nett" };
  }
}

/** Bildet tas på plantelisten og hentes på /planter/ny. Lagres krympet i sessionStorage i mellomtiden. */
export async function lagreNyttBilde(fil: File) {
  const blob = await krymp(fil);
  const dataUrl = await new Promise<string>((ok, feil) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = feil;
    r.readAsDataURL(blob);
  });
  sessionStorage.setItem(NOKKEL, dataUrl);
}

export async function hentNyttBilde(): Promise<Blob | null> {
  let dataUrl: string | null = null;
  try {
    dataUrl = sessionStorage.getItem(NOKKEL);
    sessionStorage.removeItem(NOKKEL);
  } catch {
    return null;
  }
  if (!dataUrl) return null;
  return (await fetch(dataUrl)).blob();
}
