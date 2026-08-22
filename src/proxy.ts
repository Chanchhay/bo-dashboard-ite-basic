import {
    applySetCookies,
    getSessionCookie,
    parseSetCookieHeader,
    toCookieOptions,
} from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

import { resolveKeycloakAccessToken } from "@/lib/auth/keycloak-token";

const protectedRoutes = [
    "/apps",
    "/dashboard",
    "/business",
    "/inventory",
    "/sales",
    "/pos",
    "/profile",
];
const authRoutes = ["/login", "/callback"];

/**
 * Refreshes the Keycloak tokens before the request reaches a page.
 *
 * This is the only place in a page request that can still write cookies: by
 * the time a Server Component renders, the response headers are committed and
 * a rotated refresh token would be silently dropped — leaving the browser to
 * replay a token Keycloak has already retired. See better-auth#7394 and the
 * notes in `@/lib/auth/keycloak-token`.
 *
 * The new cookie goes onto the response for the browser *and* onto the
 * forwarded request headers, so the render that follows reads the fresh token
 * rather than the one it arrived with.
 */
async function refreshedResponse(request: NextRequest) {
    try {
        const { setCookies } = await resolveKeycloakAccessToken(request.headers);

        if (setCookies.length === 0) return NextResponse.next();

        const requestHeaders = new Headers(request.headers);
        applySetCookies(requestHeaders, setCookies);

        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });

        for (const value of setCookies) {
            for (const [name, attributes] of parseSetCookieHeader(value)) {
                response.cookies.set(
                    name,
                    attributes.value,
                    toCookieOptions(attributes),
                );
            }
        }

        return response;
    } catch {
        // A refresh that cannot be completed is not a reason to refuse the
        // page. The request goes through and the route handler or the page's
        // own error state reports it, which is where the user can act on it.
        return NextResponse.next();
    }
}

export async function proxy(request: NextRequest) {
    const url = request.nextUrl;
    const { pathname, host } = url;
    const sessionCookie = getSessionCookie(request);

    const isLocalhost = host.includes("localhost:3000");
    const isFluxibiz = host.includes(".fluxibiz.store");

    if (isLocalhost || isFluxibiz) {
        const subdomain = host.split(".")[0];
        if (
            subdomain !== "www" && 
            subdomain !== "administrator" && 
            subdomain !== "business" &&
            host !== "fluxibiz.store" &&
            host !== "localhost:3000"
        ) {
            return NextResponse.rewrite(new URL(`/public-menu/${subdomain}${pathname}`, request.url));
        }
    }

    const isProtected = protectedRoutes.some((route) =>
        pathname.startsWith(route),
    );

    if (isProtected && !sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (authRoutes.includes(pathname) && sessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isProtected) {
        return refreshedResponse(request);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
