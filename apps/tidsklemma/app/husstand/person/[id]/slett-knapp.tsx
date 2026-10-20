"use client";

export function SlettPersonKnapp({ navn }: { navn: string }) {
  return (
    <button
      type="submit"
      className="lenke feil"
      onClick={(e) => {
        if (!confirm(`Fjerne ${navn} fra husstanden?`)) e.preventDefault();
      }}
    >
      Fjern {navn}
    </button>
  );
}
