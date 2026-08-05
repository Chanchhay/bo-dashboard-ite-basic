import type { NextConfig } from "next";
import path from "path";

/*
 * The notification socket is proxied through this app rather than dialled
 * directly from the browser. Two reasons:
 *
 *  - The backend origin never reaches the client. Every other backend call
 *    already goes through `backendRequest`, so the socket was the one place
 *    leaking the API host into page source and the network tab.
 *  - It sidesteps CORS entirely. The browser only ever sees its own origin,
 *    so the backend's allowed-origin list does not need an entry per deploy.
 *
 * SOCKJS_PATH must stay in step with the endpoint registered in the backend's
 * WebSocketConfig and with the path handed out by /api/session-context.
 */
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
