import { headers } from "next/headers";
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

/** Returns the `Set-Cookie` headers that expire the session client-side. */
async function clearSession(requestHeaders: Headers) {
    try {
        const { headers: responseHeaders } = await auth.api.signOut({
            headers: requestHeaders,
            returnHeaders: true,
        });

        return responseHeaders.getSetCookie();
    } catch {
        return [];
    }
}

export async function POST(request: NextRequest) {
    const requestHeaders = await headers();

    const baseUrl =
        process.env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "") ||
        request.nextUrl.origin;
    // Straight back to /login, which starts a fresh sign-in on arrival.
    const loginUrl = `${baseUrl}/login`;

    const idToken = await readIdToken(requestHeaders);
    const setCookies = await clearSession(requestHeaders);

    const target =
        (await keycloakLogoutUrl({
            idToken,
            postLogoutRedirectUri: loginUrl,
        })) ?? loginUrl;

    // 303 so the browser follows this POST with a GET.
    const response = NextResponse.redirect(target, 303);

    // `nextCookies()` already writes these through `cookies()`; repeating them
    // on the redirect keeps the session gone even if that write is skipped.
    for (const cookie of setCookies) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}
