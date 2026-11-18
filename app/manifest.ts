import type { MetadataRoute } from "next";

/**
 * The install manifest. Revision happens daily, often before fajr and often
 * offline, so the app belongs on the home screen rather than in a tab.
 * Colours match the light theme; the status bar follows the device's own
 * scheme through the viewport's two theme colours in layout.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hifz Trail",
    short_name: "Hifz Trail",
    description: "Track what you have memorised of the Qur'an and what needs revising today.",
    start_url: "/trail",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait-primary",
    categories: ["education", "lifestyle", "books"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
