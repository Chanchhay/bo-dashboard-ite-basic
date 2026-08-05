import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";

/*
 * The REST side never needs this: `backendRequest` runs on the server and
 * attaches the Keycloak token itself. The notification socket is the one place
 * the browser talks to the backend directly, so it needs a token of its own —
 * without one the STOMP session has no Principal and the backend can never
 * route `/user/queue/**` (which is how per-receiver alerts are addressed).
 *
 * The access token is short-lived and already scoped to this user, so handing
 * it to that user's own tab adds no reach they didn't have. `subject` comes
 * back alongside it because the backend identifies receivers by the Keycloak
 * subject, which is not the same value as Better Auth's local `user.id`.
 */

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

    try {
        const tokens = await auth.api.getAccessToken({
            headers: requestHeaders,
            body: { providerId: "keycloak" },
        });

        if (!tokens.accessToken) {
            return Response.json(
                { message: "No Keycloak access token available." },
                { status: 401 },
            );
        }

        return Response.json(
            {
                accessToken: tokens.accessToken,
                subject: readSubject(tokens.accessToken),
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch {
        return Response.json(
            { message: "Unable to refresh the Keycloak access token." },
            { status: 401 },
        );
    }
}
