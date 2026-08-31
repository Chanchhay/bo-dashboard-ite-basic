import {
    applySetCookies,
    getSessionCookie,
    parseSetCookieHeader,
    toCookieOptions,
} from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

import {
    KeycloakTokenError,
    expiredAuthCookies,
    resolveKeycloakAccessToken,
} from "@/lib/auth/keycloak-token";
import { BLOCKED_PARAM } from "@/lib/api/no-business";

/*
 * This app is business software end to end: every screen in it reads a
 * business, so getting in needs a signed-in account that has one. Only the
 * customer-facing storefront is public.
 *
 * Hence a deny-list. An allow-list of protected prefixes silently un-guards
 * every route nobody remembers to add — which is what had happened to
 * /analytics, /employees, /settings, /subscription, /notifications,
 * /prediction and /customer-display. This way a new route is protected from
 * the moment it exists.
 *
 * The prefix match keeps the storefront's nested paths public without listing
 * them; the shop-subdomain rewrite into /public-menu happens below and
 * returns before it reaches here.
 */
const publicRoutes = ["/public-menu"];

const authRoutes = ["/login", "/callback"];

function withCookies(response: NextResponse, setCookies: string[]) {
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
}


async function refreshedResponse(request: NextRequest) {
    try {
        const { setCookies } = await resolveKeycloakAccessToken(request.headers);

        if (setCookies.length === 0) return NextResponse.next();

        const requestHeaders = new Headers(request.headers);
        applySetCookies(requestHeaders, setCookies);

        return withCookies(
            NextResponse.next({ request: { headers: requestHeaders } }),
            setCookies,
        );
    } catch (error) {

        if (error instanceof KeycloakTokenError && error.status === 401) {
            return withCookies(
                NextResponse.redirect(new URL("/login", request.url)),
                await expiredAuthCookies(request.headers),
            );
        }


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

    const isPublic = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    // The sign-in screens stay reachable without a session, or there would be
    // no way to get one.
    const isProtected = !isPublic && !authRoutes.includes(pathname);

    if (isProtected && !sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    /*
     * A `blocked` login is the one login screen a signed-in browser must be
     * able to see: the account is authenticated but the layout guard refused
     * it — no business, or a check that could not be completed — so bouncing
     * it to /apps would only send it straight back here, endlessly.
     */
    const isBlockedLogin =
        pathname === "/login" && url.searchParams.has(BLOCKED_PARAM);

    if (authRoutes.includes(pathname) && sessionCookie && !isBlockedLogin) {
        return NextResponse.redirect(new URL("/apps", request.url));
    }

    if (isProtected) {
        return refreshedResponse(request);
    }

    return NextResponse.next();
}

export const config = {
    /*
     * Page requests only. `.*\..*` drops anything with a file extension —
     * /brand/*.png, /sw.js, /pwa/*, /manifest.webmanifest. Those are served
     * from public/ and matched no entry in the old allow-list, so they passed
     * by accident; under a deny-list they would be redirected to /login,
     * taking the login page's own logo and the service worker with them.
     */
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
