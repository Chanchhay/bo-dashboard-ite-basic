import type { NextConfig } from "next";
import path from "path";

/**
 * Hosts we are willing to fetch and re-serve pictures from.
 *
 * Imported items link to pictures still hosted by the shop's old system, so
 * this list grows by configuration rather than by code — but it stays a list.
 */
const imageHosts = [
    // Our own assets, and the avatars the sign-in provider serves.
    "auth.chanchhay.site",
    "fluxibiz.store",
    "business.fluxibiz.store",
    // Third parties we render directly: flags, exchange rates, QR codes, and
    // the placeholder photography the menu falls back to.
    "flagcdn.com",
    "api.qrserver.com",
    "images.unsplash.com",
    ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean),
];

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    turbopack: {
        root: path.join(__dirname),
    },
    images: {
        /*
         * Every host here is one our own server will fetch from and re-serve
         * under our domain. A wildcard turns the image optimiser into an open
         * proxy that anyone can aim at any address on the internet simply by
         * saving a URL against an item, so the list is named hosts only.
         *
         * NEXT_PUBLIC_IMAGE_HOSTS is where deployments add theirs — the asset
         * store and any CDN a shop's imported pictures are served from —
         * comma-separated, host names without a scheme.
         */
        remotePatterns: imageHosts.map((hostname) => ({
            protocol: "https" as const,
            hostname,
        })),
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                ],
            },
            {
                source: "/sw.js",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/javascript; charset=utf-8",
                    },
                    {
                        key: "Cache-Control",
                        value: "no-cache, no-store, must-revalidate",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: "default-src 'self'; script-src 'self'",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
