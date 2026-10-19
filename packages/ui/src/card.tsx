import type { ReactNode } from "react";

/** Kort med liten overskrift. Utseendet kommer fra `.kort` og `.kt` i appens CSS. */
export function Card({ title, stiplet, children }: { title: string; stiplet?: boolean; children?: ReactNode }) {
  return (
    <section className={stiplet ? "kort stiplet" : "kort"}>
      <p className="kt">{title}</p>
      {children}
    </section>
  );
}
