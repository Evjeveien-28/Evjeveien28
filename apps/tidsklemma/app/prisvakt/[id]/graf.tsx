import { kr } from "../data";

/** Trappegraf over prisen dag for dag, med ønsket pris som stiplet linje. */
export function Graf({ priser, onsket }: { priser: { dato: string; pris: number }[]; onsket: number | null }) {
  const B = 340, H = 100, topp = 16, bunn = 84;
  const verdier = priser.map((p) => p.pris).concat(onsket != null ? [onsket] : []);
  const maks = Math.max(...verdier), min = Math.min(...verdier);
  const y = (pris: number) => (maks === min ? (topp + bunn) / 2 : topp + ((maks - pris) / (maks - min)) * (bunn - topp));
  const x = (i: number) => 44 + (i / Math.max(1, priser.length - 1)) * (B - 50);
  const punkter = priser.flatMap((p, i) => (i === 0 ? [`${x(i)},${y(p.pris)}`] : [`${x(i)},${y(priser[i - 1]!.pris)}`, `${x(i)},${y(p.pris)}`]));
  const siste = priser.at(-1)!;
  return (
    <svg className="graf" viewBox={`0 0 ${B} ${H}`} width="100%" role="img" aria-label={`Prisen har vært mellom ${kr(min)} og ${kr(maks)}`}>
      <line x1="40" y1={topp} x2={B} y2={topp} stroke="#e6d9c2" />
      <line x1="40" y1={bunn} x2={B} y2={bunn} stroke="#e6d9c2" />
      <text x="0" y={topp + 4} fontSize="11" fill="#7a5a44">
        {kr(maks).replace(" kr", "")}
      </text>
      <text x="0" y={bunn + 4} fontSize="11" fill="#7a5a44">
        {kr(min).replace(" kr", "")}
      </text>
      {onsket != null && <line x1="40" y1={y(onsket)} x2={B} y2={y(onsket)} stroke="#66723f" strokeDasharray="5 4" />}
      <polyline fill="none" stroke="#734623" strokeWidth="3" strokeLinejoin="round" points={punkter.join(" ")} />
      <circle cx={x(priser.length - 1)} cy={y(siste.pris)} r="4" fill="#66723f" />
    </svg>
  );
}
