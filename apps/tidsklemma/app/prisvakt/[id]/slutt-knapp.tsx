"use client";

export function SluttKnapp({ navn }: { navn: string }) {
  return (
    <button
      type="submit"
      className="lenke feil"
      onClick={(e) => {
        if (!confirm(`Slutte å følge ${navn}? Prishistorikken forsvinner også.`)) e.preventDefault();
      }}
    >
      Slutt å følge
    </button>
  );
}
