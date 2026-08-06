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
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
