import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedRoutes = [
    "/apps",
    "/dashboard",
    "/business",
    "/inventory",
    "/profile",
];
const authRoutes = ["/login", "/callback"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);

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
        "/",
        "/login",
        "/callback",
        "/apps/:path*",
        "/dashboard/:path*",
        "/business/:path*",
        "/inventory/:path*",
        "/profile/:path*",
    ],
};
