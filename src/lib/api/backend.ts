import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import {
    KeycloakTokenError,
    persistAuthCookies,
    renewKeycloakAccessToken,
    resolveKeycloakAccessToken,
} from "@/lib/auth/keycloak-token";

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
      
        readonly sessionExpired = false,
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

/**
 * A usable Keycloak access token, refreshed when needed and persisted here so
 * the browser converges on the rotated cookie. All rotation lives in
 * `@/lib/auth/keycloak-token`; nothing in this file may refresh on its own.
 */
async function getKeycloakAccessToken(renew = false) {
    const requestHeaders = await headers();

    // The account cookie holds the Keycloak tokens, but the session cookie is
    // what says this browser is still signed in. Both are written and expired
    // together, so a live account cookie without a session means a sign-out
    // this request must not be allowed to outlive.
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session) {
        throw new BackendApiError("Your session has expired.", 401, true);
    }

    try {
        const { accessToken, setCookies } = renew
            ? await renewKeycloakAccessToken(requestHeaders)
            : await resolveKeycloakAccessToken(requestHeaders);

        await persistAuthCookies(setCookies);

        return accessToken;
    } catch (error) {
        if (error instanceof KeycloakTokenError) {
            throw new BackendApiError(
                error.message,
                error.status,
                error.status === 401,
            );
        }

        throw new BackendApiError(
            "Unable to refresh the Keycloak access token.",
            401,
        );
    }
}

/**
 * Whether the request can be sent a second time. A 401 means the backend
 * rejected the token before reading the body, so replaying is safe — but only
 * for a body we can hand to `fetch` twice. A stream is consumed by the first
 * attempt and cannot be.
 */
function isReplayable(body: RequestInit["body"]) {
    return (
        body === undefined ||
        body === null ||
        typeof body === "string" ||
        body instanceof FormData ||
        body instanceof URLSearchParams
    );
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
    const requestHeaders = new Headers(init?.headers);

    if (!requestHeaders.has("Accept")) {
        requestHeaders.set("Accept", "application/json");
    }

    // `FormData` bodies must keep the boundary `fetch` generates for them.
    if (
        typeof init?.body === "string" &&
        !requestHeaders.has("Content-Type")
    ) {
        requestHeaders.set("Content-Type", "application/json");
    }

    const send = async (accessToken: string) => {
        requestHeaders.set("Authorization", `Bearer ${accessToken}`);

        return fetch(`${getApiBaseUrl()}${path}`, {
            ...init,
            cache: "no-store",
            headers: requestHeaders,
        });
    };

    let response = await send(await getKeycloakAccessToken());

    /*
     * The backend is the only party that can tell us a token it was given is
     * no longer good. Access tokens are short enough that one can expire
     * between being resolved and being read, so a 401 earns a forced refresh
     * and one replay rather than an error the user has to click through.
     */
    if (response.status === 401 && isReplayable(init?.body)) {
        response = await send(await getKeycloakAccessToken(true));
    }

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
            error.sessionExpired
                ? { message: error.message, sessionExpired: true }
                : { message: error.message },
            { status: error.status },
        );
    }

    return Response.json(
        { message: "The backend API request failed." },
        { status: 500 },
    );
}
