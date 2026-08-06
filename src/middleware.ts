import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

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

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const { pathname, host } = url;
    const sessionCookie = getSessionCookie(request);

    // 1. Handle Subdomain Routing
    const isLocalhost = host.includes("localhost:3000");
    const isFluxibiz = host.includes(".fluxibiz.store");

    if (isLocalhost || isFluxibiz) {
        const subdomain = host.split(".")[0];
        // Exclude root domain and special domains
        if (subdomain !== "www" && subdomain !== "administrator" && host !== "fluxibiz.store") {
            // Rewrite to /public-menu/[subdomain]/[path]
            return NextResponse.rewrite(new URL(`/public-menu/${subdomain}${pathname}`, request.url));
        }
    }

    // 2. Handle Authentication for Dashboard
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
        if (!sessionCookie) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    if (authRoutes.includes(pathname) && sessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
