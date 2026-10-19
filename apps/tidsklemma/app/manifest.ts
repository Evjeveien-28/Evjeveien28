import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tidsklemma",
    short_name: "Tidsklemma",
    description: "Hjemme-appen for Evjeveien 28",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ea",
    theme_color: "#fbf6ea",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
