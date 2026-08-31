import { NextResponse, type NextRequest } from "next/server";

import { NO_BUSINESS_LOGIN_URL } from "@/lib/api/no-business";
import { clearLocalSession } from "@/lib/auth/local-signout";

/*
 * The in-app counterpart of the /api/post-login gate, for a business that goes
 * away while a dashboard is open — a staff account deactivated, say. The API
 * guard in `baseApi` posts here, and this drops the local session so the
 * middleware lets /login render instead of bouncing back to /apps.
 *
 * POST only: a session-clearing GET can be fired by any third-party page.
 */
export async function POST(request: NextRequest) {
    const response = NextResponse.redirect(
        new URL(NO_BUSINESS_LOGIN_URL, request.nextUrl.origin),
        // 303 so the browser follows this POST with a GET.
        303,
    );

    for (const cookie of await clearLocalSession(new Headers(request.headers))) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}
