/** Enkle strek-ikoner som følger tekstfargen. */
const stier = {
  middag: '<path d="M5 13a7 7 0 0 0 14 0H5z"/><path d="M9 9c0-2 2-2 2-4M13 9c0-2 2-2 2-4"/>',
  handleliste: '<path d="M6 8h12l-1 11H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  vask: '<path d="M12 4c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z"/>',
  kalender: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  plante: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/><path d="M7 21h10"/>',
  hus: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  faceid:
    '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.6 1.2 4.4 1.2 6 0"/>',
} as const;

export type IkonNavn = keyof typeof stier;

export function Ikon({ navn, storrelse = 24 }: { navn: IkonNavn; storrelse?: number }) {
  return (
    <svg
      width={storrelse}
      height={storrelse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: stier[navn] }}
    />
  );
}
