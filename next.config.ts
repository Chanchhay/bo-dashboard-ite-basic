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

        return [
            {
                source: "/:path*",
                has: [
                    {
                        type: "host",
                        value: "(?<subdomain>[^.]+)\\.fluxibiz\\.store",
                    },
                ],
                destination: "/public-menu/:subdomain/:path*",
            },
            {
                source: "/:path*",
                has: [
                    {
                        type: "host",
                        value: "(?<subdomain>[^.]+)\\.localhost:3000",
                    },
                ],
                destination: "/public-menu/:subdomain/:path*",
            },
            {
                source: `${SOCKJS_PATH}/:path*`,
                destination: `${apiBaseUrl}${SOCKJS_PATH}/:path*`,
            },
        ];
    },
};

export default nextConfig;
