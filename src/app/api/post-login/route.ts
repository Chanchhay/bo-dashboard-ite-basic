import { NextResponse, type NextRequest } from "next/server";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import { NO_BUSINESS_LOGIN_URL, isNoBusinessError } from "@/lib/api/no-business";
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
    try {
        await backendRequest("/api/v1/businesses/me");
    } catch (error) {
        if (
            error instanceof BackendApiError &&
            isNoBusinessError(error.status, error.message)
        ) {
            const response = NextResponse.redirect(
                new URL(NO_BUSINESS_LOGIN_URL, request.nextUrl.origin),
            );

            // Local cookies only — the Keycloak session stays up for the
            // administrator app. Without this the middleware would read the
            // session cookie on /login and send them back to /dashboard.
            for (const cookie of await clearLocalSession(
                new Headers(request.headers),
            )) {
                response.headers.append("set-cookie", cookie);
            }

            return response;
        }

        // A backend that is down or slow is not a reason to refuse the
        // sign-in; the dashboard reports its own load failures.
    }

    return NextResponse.redirect(new URL("/apps", request.nextUrl.origin));
}
