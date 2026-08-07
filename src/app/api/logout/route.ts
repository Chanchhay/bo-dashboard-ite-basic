import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth/auth";
import { keycloakLogoutUrl } from "@/lib/auth/keycloak-logout";

/*
 * Sign-out lives outside `/api/auth/[...all]` on purpose: Better Auth's own
 * `/sign-out` only drops our cookies, and a browser whose Keycloak session is
 * still alive would be signed straight back in on the next visit to /login.
 * This handler does both halves — clear the session here, then hand the
 * browser to Keycloak's end-session endpoint.
 *
 * POST only. A logout reachable by GET can be fired by any third-party page
 * embedding an <img> tag pointed at it.
 */

/** The ID token proves the session to Keycloak, so read it before signing out. */
async function readIdToken(requestHeaders: Headers) {
    try {
        const tokens = await auth.api.getAccessToken({
            headers: requestHeaders,
            body: { providerId: "keycloak" },
        });

        return tokens.idToken ?? undefined;
    } catch {
        // An expired or missing account just means a confirmation prompt.
        return undefined;
    }
}

/** Returns Better Auth's complete cookie cleanup, including chunked cookies. */
async function clearSession(requestHeaders: Headers) {
    const { headers: responseHeaders } = await auth.api.signOut({
        headers: requestHeaders,
        returnHeaders: true,
    });

    return responseHeaders.getSetCookie();
}

export async function POST(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    const signedOutUrl = new URL("/login?loggedOut=1", request.nextUrl.origin);

    const idToken = await readIdToken(requestHeaders);
    let setCookies: string[];

    try {
        setCookies = await clearSession(requestHeaders);
    } catch {
        return NextResponse.json(
            { error: "Unable to clear the current session" },
            { status: 500 },
        );
    }

    const target =
        (await keycloakLogoutUrl({
            idToken,
            postLogoutRedirectUri: signedOutUrl.toString(),
        })) ?? signedOutUrl.toString();

    // 303 so the browser follows this POST with a GET.
    const response = NextResponse.redirect(target, 303);

    // Forward Better Auth's exact cookie cleanup onto the redirect response.
    // This includes account_data and any chunked session/account cookies.
    for (const cookie of setCookies) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}
