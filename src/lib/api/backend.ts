import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";

type ApiErrorResponse = {
    message?: string;
};

export class BackendApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "BackendApiError";
    }
}

function getApiBaseUrl() {
    const baseUrl = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");

    if (!baseUrl) {
        throw new BackendApiError(
            "API_BASE_URL is not configured on the server.",
            500,
        );
    }

    return baseUrl;
}

async function getKeycloakAccessToken() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session) {
        throw new BackendApiError("Your session has expired.", 401);
    }

    try {
        const tokens = await auth.api.getAccessToken({
            headers: requestHeaders,
            body: { providerId: "keycloak" },
        });

        if (!tokens.accessToken) {
            throw new BackendApiError(
                "Unable to get a Keycloak access token.",
                401,
            );
        }

        return tokens.accessToken;
    } catch (error) {
        if (error instanceof BackendApiError) {
            throw error;
        }

        throw new BackendApiError(
            "Unable to refresh the Keycloak access token.",
            401,
        );
    }
}

async function readErrorMessage(response: Response) {
    try {
        const payload = (await response.json()) as ApiErrorResponse;
        return payload.message;
    } catch {
        return undefined;
    }
}

export async function backendRequest<T>(
    path: string,
    init?: RequestInit,
) {
    const accessToken = await getKeycloakAccessToken();
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new BackendApiError(
            message || `Backend API request failed (${response.status}).`,
            response.status,
        );
    }

    // Several endpoints answer 200/201 with an empty body (creating or
    // updating staff and roles, for instance). `response.json()` throws on
    // those, so read the text first and only parse when there is something.
    const text = await response.text();

    return (text ? JSON.parse(text) : undefined) as T;
}

export function backendErrorResponse(error: unknown) {
    if (error instanceof BackendApiError) {
        return Response.json(
            { message: error.message },
            { status: error.status },
        );
    }

    return Response.json(
        { message: "The backend API request failed." },
        { status: 500 },
    );
}
