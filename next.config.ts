import type { NextConfig } from "next";
import path from "path";

const SOCKJS_PATH = "/ws/notifications-sockjs";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    turbopack: {
        root: path.join(__dirname),
    },
    async rewrites() {
        const apiBaseUrl = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");

        // Nothing to proxy to; the socket simply won't connect.
        if (!apiBaseUrl) return [];

        const dynamicRewrites = [
            {
                source: "/:path*",
                has: [
                    {
                        type: "host" as const,
                        value: "(?<subdomain>[^.]+)\\.fluxibiz\\.store",
                    },
                ],
                destination: "/public-menu/:subdomain/:path*",
            },
            {
                source: "/:path*",
                has: [
                    {
                        type: "host" as const,
                        value: "(?<subdomain>[^.]+)\\.localhost:3000",
                    },
                ],
                destination: "/public-menu/:subdomain/:path*",
            },
        ];

        if (!apiBaseUrl) {
            return {
                beforeFiles: dynamicRewrites,
                afterFiles: [],
                fallback: [],
            };
        }

        return {
            beforeFiles: dynamicRewrites,
            afterFiles: [
                {
                    source: `${SOCKJS_PATH}/:path*`,
                    destination: `${apiBaseUrl}${SOCKJS_PATH}/:path*`,
                },
            ],
            fallback: [],
        };
    },
};

export default nextConfig;
