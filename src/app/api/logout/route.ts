import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth/auth";
import { keycloakLogoutUrl } from "@/lib/auth/keycloak-logout";

async function readIdToken(requestHeaders: Headers) {
    try {
        const tokens = await auth.api.getAccessToken({
            headers: requestHeaders,
            body: { providerId: "keycloak" },
        });

        return tokens.idToken ?? undefined;
    } catch {
        return undefined;
    }
}

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

    const response = NextResponse.redirect(target, 303);

    for (const cookie of setCookies) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}
