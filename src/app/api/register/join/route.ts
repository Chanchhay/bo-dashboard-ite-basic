import { NextResponse, type NextRequest } from "next/server";

import {
    findCurrentRegisterSession,
    joinRegisterSession,
} from "@/lib/api/pos-session-backend";
import { POS_SESSION_COOKIE } from "@/lib/api/pos-session";
import { POS_ROUTES } from "@/lib/pos-routes";

/**
 * Server-side entry handoff for a shared drawer.
 *
 * The register page only sends an active session here. We still discover it
 * again so a stale or user-supplied id can never choose which drawer to join.
 */
export async function GET(request: NextRequest) {
    try {
        const current = await findCurrentRegisterSession();

        if (!current) {
            return NextResponse.redirect(
                new URL(POS_ROUTES.openRegister, request.url),
            );
        }

        const joined = await joinRegisterSession(current.id);
        const response = NextResponse.redirect(
            new URL(POS_ROUTES.terminal, request.url),
        );

        response.cookies.set(POS_SESSION_COOKIE, String(joined.id), {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 16,
        });

        return response;
    } catch {
        const retryUrl = new URL(POS_ROUTES.openRegister, request.url);
        retryUrl.searchParams.set("status", "join-failed");

        return NextResponse.redirect(retryUrl);
    }
}
