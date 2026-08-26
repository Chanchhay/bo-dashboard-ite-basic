import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest; Next injects the <link rel="manifest"> tag.
// Colors mirror the tokens in globals.css (--brand-green, --background).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FluxiBiz Terminal & Business Dashboard",
    short_name: "FluxiBiz",
    description:
      "Powering Business Without Limits. Manage Better, Sell More, Grow Faster.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#00932a",
    icons: [
      {
        src: "/pwa/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
