import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MÁS San Miguel",
    short_name: "MÁS",
    description: "Portal de actividades y servicios de MÁS San Miguel.",
    start_url: "/citizen",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F7FBF5",
    theme_color: "#1D4F36",
    lang: "es-AR",
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
