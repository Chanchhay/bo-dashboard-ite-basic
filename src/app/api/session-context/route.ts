import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import {
    persistAuthCookies,
    resolveKeycloakAccessToken,
} from "@/lib/auth/keycloak-token";

/*
 * The parts of the server-side session the browser legitimately needs.
 *
 * `subject` is the Keycloak `sub`, which is how the backend identifies a user:
 * `SecurityUtils.extractUserId()` reads it off the JWT, and the notification
 * inbox query matches `receiverId` against it. Better Auth's `session.user.id`
 * is a different, local value, so anything addressed with that id is written
 * under a key the inbox will never look up.
 *
 * `wsUrl` is the backend's WebSocket endpoint, which the browser dials
 * directly. Proxying it through this app would be preferable, but Vercel
 * cannot forward a WebSocket upgrade and times out long-lived streaming
 * requests, so a rewrite gets as far as the SockJS handshake and then dies.
 *
 * Serving it from here rather than a NEXT_PUBLIC_ var is what is still worth
 * doing: the host stays out of the JS bundle and out of anonymous page source,
 * and is only handed to a request that already carries a session.
 *
 * Deriving it from API_BASE_URL also guarantees the socket and the REST proxy
 * address the same backend. They must: notifications are created over REST and
 * published to that instance's in-process SimpleBroker, so a socket pointed
 * elsewhere subscribes to a broker that will never see them. That is exactly
 * what a separately configured NEXT_PUBLIC_WS_URL caused.
 *
 * The token is sent for when the backend grows a STOMP auth interceptor (it
 * has none today, so the CONNECT frame is anonymous and `/user/queue/**` never
 * routes — delivery rides on `/topic/notifications` instead). It is
 * short-lived and already scoped to this user, so handing it to that user's
 * own tab adds no reach they didn't have.
 */

/**
 * The backend's raw STOMP endpoint as a ws:// or wss:// URL, derived from the
 * REST target so the two can never address different backends. Null when
 * API_BASE_URL is unset, so the client doesn't retry a socket forever.
 *
 * The raw endpoint rather than the SockJS one: SockJS opens with an XHR to
 * /info, which is a CORS-preflighted cross-origin request. A WebSocket
 * upgrade skips that, leaving the backend's Origin check as the only gate.
 */
function getSocketUrl(): string | null {
    const baseUrl = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");

    if (!baseUrl) return null;

    return `${baseUrl.replace(/^http/, "ws")}/ws/notifications`;
}

/** Reads the `sub` claim without verifying — the backend still verifies the token. */
function readSubject(accessToken: string): string | null {
    try {
        const payload = accessToken.split(".")[1];
        if (!payload) return null;

        const json = Buffer.from(
            payload.replace(/-/g, "+").replace(/_/g, "/"),
            "base64",
        ).toString("utf8");

        const claims = JSON.parse(json) as { sub?: string };
        return claims.sub ?? null;
    } catch {
        return null;
    }
}

export async function GET() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session) {
        return Response.json({ message: "Not authenticated." }, { status: 401 });
    }

    /*
     * A token failure is not fatal here. Delivery currently rides on the
     * unauthenticated `/topic/notifications` broadcast, so the socket is still
     * worth opening without one — failing the whole request would take
     * realtime down for a problem it does not actually depend on.
     */
    let accessToken: string | null = null;

    try {
        const resolved = await resolveKeycloakAccessToken(requestHeaders);
        await persistAuthCookies(resolved.setCookies);
        accessToken = resolved.accessToken;
    } catch {
        accessToken = null;
    }

    return Response.json(
        {
            accessToken,
            subject: accessToken ? readSubject(accessToken) : null,
            wsUrl: getSocketUrl(),
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}
