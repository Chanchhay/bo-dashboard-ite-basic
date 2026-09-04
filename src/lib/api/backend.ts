import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import {
    NO_BUSINESS_FLAG,
    isNoBusinessError,
} from "@/lib/api/no-business";
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

/**
 * A request body that is not valid JSON. Distinct from every other failure
 * these routes can hit: `backendRequest` also parses JSON — the backend's
 * response, at the bottom of this file — so a bare `SyntaxError` cannot say
 * which side sent the bad bytes. Naming this one at the point it is read
 * keeps a malformed request from being reported as a backend fault.
 */
export class RequestBodyError extends Error {
    constructor(message = "The request body is not valid JSON.") {
        super(message);
        this.name = "RequestBodyError";
    }
}

/**
 * Reads and parses a route's JSON body. Use instead of `request.json()` so a
 * malformed body surfaces as a 400 naming the request, not a 500 blaming the
 * backend.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        throw new RequestBodyError();
    }
}

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

async function getKeycloakAccessToken(renew = false) {
    const requestHeaders = await headers();
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

/**
 * Tells the backend who is really calling.
 *
 * Every request from this app reaches the API through this server, so the
 * connection the backend sees is always ours and never the person using the
 * browser. Anything that records or counts by caller — the audit log's "signed
 * in from", the rate limiter's buckets — would otherwise describe this process
 * and put every member of staff in one bucket.
 *
 * `X-Client-IP` is the header the backend already reads first for exactly this
 * reason. The user agent travels under its own name rather than overwriting
 * `User-Agent`, which belongs to the hop that is actually being made.
 *
 * Neither is proof of anything: this is the honest answer to "who was this
 * on behalf of", not an identity claim.
 */
async function forwardCallerHeaders(requestHeaders: Headers) {
    try {
        const incoming = await headers();

        const clientIp =
            incoming.get("x-client-ip") ??
            incoming.get("x-forwarded-for")?.split(",")[0]?.trim();

        if (clientIp && !requestHeaders.has("X-Client-IP")) {
            requestHeaders.set("X-Client-IP", clientIp);
        }

        const userAgent = incoming.get("user-agent");
        if (userAgent && !requestHeaders.has("X-Client-User-Agent")) {
            requestHeaders.set("X-Client-User-Agent", userAgent);
        }
    } catch {
        // Outside a request — a build-time render, say. There is no caller to
        // describe, and failing the call over it would be absurd.
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

    await forwardCallerHeaders(requestHeaders);

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

    
    
    
    const text = await response.text();

    return (text ? JSON.parse(text) : undefined) as T;
}

export function backendErrorResponse(error: unknown) {
    if (error instanceof RequestBodyError) {
        return Response.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof BackendApiError) {
        if (error.sessionExpired) {
            return Response.json(
                { message: error.message, sessionExpired: true },
                { status: error.status },
            );
        }

        // An account with no business has nothing this app can show; the
        // browser turns this flag into a trip back to the login screen.
        if (isNoBusinessError(error.status, error.message)) {
            return Response.json(
                { message: error.message, [NO_BUSINESS_FLAG]: true },
                { status: error.status },
            );
        }

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
