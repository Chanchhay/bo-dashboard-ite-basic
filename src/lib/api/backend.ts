import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";

type ApiErrorDetail = {
    field?: string;
    message?: string;
};

type ApiErrorResponse = {
    message?: string;
    errorDetail?: ApiErrorDetail[];
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

        return tokens?.accessToken;
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
        if (Array.isArray(payload?.errorDetail) && payload.errorDetail.length > 0) {
            const details = payload.errorDetail
                .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                .filter(Boolean)
                .join("; ");
            if (details) {
                return `${payload.message || "Validation error"}: ${details}`;
            }
        }
        return payload.message;
    } catch {
        return undefined;
    }
}

export async function backendResponse(
    path: string,
    init?: RequestInit,
) {
    const accessToken = await getKeycloakAccessToken();
    const requestHeaders = new Headers(init?.headers);

    if (!requestHeaders.has("Accept")) {
        requestHeaders.set("Accept", "application/json");
    }

    requestHeaders.set("Authorization", `Bearer ${accessToken}`);

    // `FormData` bodies must keep the boundary `fetch` generates for them.
    if (
        typeof init?.body === "string" &&
        !requestHeaders.has("Content-Type")
    ) {
        requestHeaders.set("Content-Type", "application/json");
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        cache: "no-store",
        headers: requestHeaders,
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new BackendApiError(
            message || `Backend API request failed (${response.status}).`,
            response.status,
        );
    }

    return response;
}

export async function backendRequest<T>(
    path: string,
    init?: RequestInit,
) {
    const response = await backendResponse(path, init);

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
