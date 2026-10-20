import Link from "next/link";

/** Huset i Evjeveien med vindkast, samme tegning som app-ikonet (`icon.svg`). */
export function Logo({ storrelse, className }: { storrelse: number; className?: string }) {
  return (
    <svg viewBox="0 0 180 180" width={storrelse} height={storrelse} className={className} aria-hidden="true">
      <rect width="180" height="180" fill="#a9c5db" />
      <rect y="150" width="180" height="30" fill="#66723f" />
      <g transform="translate(90 150) scale(1.14) translate(-90 -150)">
        <rect x="104" y="30" width="11" height="20" fill="#734623" />
        <path d="M52 44H128L152 60H28Z" fill="#4a2e1c" />
        <rect x="38" y="60" width="104" height="90" fill="#f3ead6" />
        {[46, 80, 114].map((x) => (
          <g key={x}>
            <rect x={x} y="70" width="20" height="23" fill="#734623" />
            <rect x={x + 3} y="73" width="6" height="17" fill="#a9c5db" />
            <rect x={x + 11} y="73" width="6" height="17" fill="#a9c5db" />
          </g>
        ))}
        <g transform="translate(88 120) scale(0.75) translate(-88 -120)" fill="none" stroke="#734623" strokeWidth="4.5" strokeLinecap="round">
          <path d="M62 112H100a7 7 0 1 0-7-7" />
          <path d="M56 124H112a8 8 0 1 1-8 8" />
          <path d="M66 136H92" />
        </g>
      </g>
    </svg>
  );
}

export function Topp() {
  return (
    <Link href="/" className="topp" aria-label="Tidsklemma, til startsiden">
      <Logo storrelse={40} className="logo mini" />
      <span className="navn">TIDSKLEMMA</span>
    </Link>
  );
}
