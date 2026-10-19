"use client";

export function AvlysKnapp({ tittel }: { tittel: string }) {
  return (
    <button
      type="submit"
      className="lenke feil"
      onClick={(e) => {
        if (!confirm(`Avlyse ${tittel}? De andre får beskjed.`)) e.preventDefault();
      }}
    >
      Avlys
    </button>
  );
}
