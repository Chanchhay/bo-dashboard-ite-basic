import { NextResponse, type NextRequest } from "next/server";

import { NO_BUSINESS_LOGIN_URL } from "@/lib/api/no-business";
import { clearLocalSession } from "@/lib/auth/local-signout";

export async function POST(request: NextRequest) {
    const response = NextResponse.redirect(
        new URL(NO_BUSINESS_LOGIN_URL, request.nextUrl.origin),
        303,
    );

    for (const cookie of await clearLocalSession(new Headers(request.headers))) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}
