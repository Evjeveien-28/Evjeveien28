import type { ReactNode } from "react";

export function Card({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{title}</h2>
      {children}
    </section>
  );
}
