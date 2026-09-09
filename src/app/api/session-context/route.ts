import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import {
    persistAuthCookies,
    resolveKeycloakAccessToken,
} from "@/lib/auth/keycloak-token";

function getSocketUrl(): string | null {
    const baseUrl = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");

    if (!baseUrl) return null;

    return `${baseUrl.replace(/^http/, "ws")}/ws/notifications`;
}

function readSubject(accessToken: string): string | null {
    try {
        const payload = accessToken.split(".")[1];
        if (!payload) return null;

        const json = Buffer.from(
            payload.replace(/-/g, "+").replace(/_/g, "/"),
            "base64",
        ).toString("utf8");

        const claims = JSON.parse(json) as { sub?: string };
        return claims.sub ?? null;
    } catch {
        return null;
    }
}

export async function GET() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session) {
        return Response.json({ message: "Not authenticated." }, { status: 401 });
    }

    let accessToken: string | null = null;

    try {
        const resolved = await resolveKeycloakAccessToken(requestHeaders);
        await persistAuthCookies(resolved.setCookies);
        accessToken = resolved.accessToken;
    } catch {
        accessToken = null;
    }

    return Response.json(
        {
            accessToken,
            subject: accessToken ? readSubject(accessToken) : null,
            wsUrl: getSocketUrl(),
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}
