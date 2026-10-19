import Link from "next/link";

/** Husnummerskiltet: stort på innloggingssiden, lite i toppen av de andre sidene. */
export function Skilt() {
  return (
    <div className="skilt" aria-label="Evjeveien 28">
      <span className="gate">EVJEVEIEN</span>
      <span className="nr">28</span>
    </div>
  );
}

export function Topp() {
  return (
    <Link href="/" className="topp" aria-label="Tidsklemma, til startsiden">
      <span className="skilt mini" aria-hidden="true">
        <span className="nr">28</span>
      </span>
      <span className="navn">TIDSKLEMMA</span>
    </Link>
  );
}
