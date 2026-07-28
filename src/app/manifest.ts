import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mordisco ERP",
    short_name: "Mordisco ERP",
    description: "Gestión gastronómica integral",
    start_url: "/",
    display: "standalone",
    background_color: "#111318",
    theme_color: "#F4B400",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
