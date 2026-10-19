"use client";

export function SlettKnapp({ navn }: { navn: string }) {
  return (
    <button
      type="submit"
      className="lenke feil"
      onClick={(e) => {
        if (!confirm(`Slette ${navn}? Historikken forsvinner også.`)) e.preventDefault();
      }}
    >
      Slett plante
    </button>
  );
}
