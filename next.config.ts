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
                source: `${SOCKJS_PATH}/:path*`,
                destination: `${apiBaseUrl}${SOCKJS_PATH}/:path*`,
            },
        ];
    },
};

export default nextConfig;
