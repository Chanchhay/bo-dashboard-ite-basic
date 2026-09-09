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

    const isProtected = !isPublic && !authRoutes.includes(pathname);

    if (isProtected && !sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

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
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
