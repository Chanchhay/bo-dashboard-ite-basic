import { NextResponse, type NextRequest } from "next/server";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import {
    NO_BUSINESS_LOGIN_URL,
    UNVERIFIED_LOGIN_URL,
    isNoBusinessError,
} from "@/lib/api/no-business";
import { clearLocalSession } from "@/lib/auth/local-signout";

export async function GET(request: NextRequest) {
    const blocked = await blockedLoginTarget();

    if (!blocked) {
        return NextResponse.redirect(new URL("/apps", request.nextUrl.origin));
    }

    const response = NextResponse.redirect(
        new URL(blocked, request.nextUrl.origin),
    );

    for (const cookie of await clearLocalSession(new Headers(request.headers))) {
        response.headers.append("set-cookie", cookie);
    }

    return response;
}

async function blockedLoginTarget() {
    try {
        const business = await backendRequest<{ id?: string } | undefined>(
            "/api/v1/businesses/me",
        );

        return business?.id ? null : NO_BUSINESS_LOGIN_URL;
    } catch (error) {
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
