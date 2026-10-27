import type { MetadataRoute } from "next";

import { defaultDescription } from "@/lib/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taalib",
    short_name: "Taalib",
    description: defaultDescription,
    start_url: "/",
    display: "standalone",
    // Palette du logo : écran de démarrage crème, barre de l'app brune.
    background_color: "#f5f5ed",
    theme_color: "#21140f",
    // Logo « طالب » crème sur brun (public/). La version maskable laisse plus
    // de marge : Android la rogne jusqu'à un cercle de 80 %.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
