import { NextResponse, type NextRequest } from "next/server";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import {
    NO_BUSINESS_LOGIN_URL,
    UNVERIFIED_LOGIN_URL,
    isNoBusinessError,
} from "@/lib/api/no-business";
import { clearLocalSession } from "@/lib/auth/local-signout";

/*
 * Where Keycloak sends the browser once the sign-in completes.
 *
 * The gate has to sit here rather than inside the dashboard: this app shares
 * one realm SSO session with the administrator app, so an administrator who is
 * signed in over there is silently signed in here too, and lands on a
 * dashboard with no business behind it. Checking before the first dashboard
 * paint is what keeps them out of it entirely.
 *
 * Under /api so the middleware's `authRoutes` rule cannot bounce this to
 * /dashboard before the check runs.
 */
export async function GET(request: NextRequest) {
    const blocked = await blockedLoginTarget();

    if (!blocked) {
        return NextResponse.redirect(new URL("/apps", request.nextUrl.origin));
    }

    const response = NextResponse.redirect(
        new URL(blocked, request.nextUrl.origin),
    );

    // Local cookies only — the Keycloak session stays up for the administrator
    // app. Without this the middleware would read the session cookie on /login
    // and send them back to /apps.
    for (const cookie of await clearLocalSession(new Headers(request.headers))) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}

/**
 * The login URL to bounce to, or null to let the sign-in through.
 *
 * Only a business the backend actually returned lets anyone past. This used to
 * turn people away solely on a recognisable no-business 404 and wave through
 * every other outcome, so a refused token — which the backend answers with a
 * bodyless 401 — signed a business-less account straight into the dashboard.
 */
async function blockedLoginTarget() {
    try {
        const business = await backendRequest<{ id?: string } | undefined>(
            "/api/v1/businesses/me",
        );

        return business?.id ? null : NO_BUSINESS_LOGIN_URL;
    } catch (error) {
        // As in `business-guard`: only our own errors describe the account.
        if (!(error instanceof BackendApiError)) throw error;

        if (isNoBusinessError(error.status, error.message)) {
            return NO_BUSINESS_LOGIN_URL;
        }

        console.error(
            "[post-login] could not verify the account's business:",
            `${error.status} ${error.message}`,
        );

        return UNVERIFIED_LOGIN_URL;
    }
}
