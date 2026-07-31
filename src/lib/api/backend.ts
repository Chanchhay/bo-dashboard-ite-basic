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
        console.log("===> AccessToken => ", tokens.accessToken)

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
        return payload.message;
    } catch {
        return undefined;
    }
}

export async function backendRequest<T>(
    path: string,
    init?: RequestInit,
) {
    // const accessToken = await getKeycloakAccessToken();
    const accessToken = "eyJhbGciOiJSUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuQmNJc01nWC12SEhqS0NQOFZSTHRnd1NGcUxvMGJRSGk2cTgxa1ExTTdVIn0.eyJleHAiOjE3ODU0NjAyMTEsImlhdCI6MTc4NTQyNDIxMywiYXV0aF90aW1lIjoxNzg1NDI0MjExLCJqdGkiOiJvbnJ0YWM6NjQzZjczMTEtM2VmNS1iMmIxLTQyMDctYjUyMzA4NDg1YTkzIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNoYW5jaGhheS5zaXRlL3JlYWxtcy9pc3RhZC1mbHV4aXBvcy1hdXRoIiwiYXVkIjpbImZsdXhpcG9zLWJhY2tlbmQiLCJyZWFsbS1tYW5hZ2VtZW50IiwiYnJva2VyIiwiYWNjb3VudCJdLCJzdWIiOiIwNzlhZDQxMy1mYzRkLTRhZjctOTgwNy02ZDI5ZTg3YjE4ZGIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJmbHV4aXBvcy1jbGllbnQiLCJzaWQiOiJjNDk0NTkyMC0wYjdmLWM4MDctYWE0Ny02OGFlYmE2M2MzMGEiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHBzOi8vYm8tZGFzaGJvYXJkLWl0ZS1iYXNpYy1seWFydC52ZXJjZWwuYXBwIiwiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaHR0cHM6Ly93d3cua2V5Y2xvYWsub3JnIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlzdGFkLWZsdXhpcG9zLWF1dGgiLCJvZmZsaW5lX2FjY2VzcyIsIkJVU0lORVNTIiwidW1hX2F1dGhvcml6YXRpb24iLCJVU0VSIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiZmx1eGlwb3MtYmFja2VuZCI6eyJyb2xlcyI6WyJpdGVtOmNyZWF0ZSIsInN0b2NrOndyaXRlIiwibWVtYmVyOnJlYWQiLCJyb2xlOnVwZGF0ZSIsInVuaXQ6cmVhZCIsIml0ZW0tZ3JvdXA6cmVhZCIsIm9yZGVyOnJlYWQiLCJvcmRlcjpnZW5lcmF0ZS1raHFyIiwib3JkZXI6Y3JlYXRlIiwic3RvcmVmcm9udDp1cGRhdGUiLCJpdGVtOnJlYWQiLCJjdXJyZW5jeTpyZWFkIiwiaXRlbTp1cGRhdGUiLCJpdGVtLWdyb3VwOmRlbGV0ZSIsInRlbGVncmFtLXNldHRpbmc6cmVhZCIsImJha29uZy1zZXR0aW5nOnVwZGF0ZSIsImN1cnJlbmN5OnVwZGF0ZSIsIm9yZGVyOmNhbmNlbCIsInN0b2NrOnJlYWQiLCJtZW1iZXI6bWFuYWdlIiwiYnVzaW5lc3M6cmVhZCIsInRlbGVncmFtLXNldHRpbmc6dXBkYXRlIiwicm9sZTpkZWxldGUiLCJiYWtvbmctc2V0dGluZzpwcmV2aWV3IiwiY3VycmVuY3k6ZGVsZXRlIiwiaXRlbS1ncm91cDpjcmVhdGUiLCJiYWtvbmctc2V0dGluZzpyZWFkIiwib3JkZXI6cGF5IiwiYnVzaW5lc3M6dXBkYXRlIiwiYnVzaW5lc3M6ZGVsZXRlIiwiY3VycmVuY3k6c2V0LWRpc3BsYXkiLCJyb2xlOnJlYWQiLCJyb2xlOmFzc2lnbiIsImN1cnJlbmN5OmNyZWF0ZSIsInByb2ZpbGU6cmVhZCIsImJ1c2luZXNzOmNyZWF0ZSIsInN0b3JlZnJvbnQ6cmVhZCIsInJvbGU6Y3JlYXRlIiwiaXRlbTpkZWxldGUiLCJpdGVtLWdyb3VwOnVwZGF0ZSIsImN1cnJlbmN5OnNldC1iYXNlIiwicHJvZmlsZTp1cGRhdGUiXX0sInJlYWxtLW1hbmFnZW1lbnQiOnsicm9sZXMiOlsiY3JlYXRlLWNsaWVudCJdfSwiYnJva2VyIjp7InJvbGVzIjpbInJlYWQtdG9rZW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJ2aWV3LWFwcGxpY2F0aW9ucyIsInZpZXctY29uc2VudCIsInZpZXctZ3JvdXBzIiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJkZWxldGUtYWNjb3VudCIsIm1hbmFnZS1jb25zZW50Iiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZ2VuZGVyIjoiRkVNQUxFIiwibmFtZSI6ImxlYW5nIGxlYW5nIiwicHJlZmVycmVkX3VzZXJuYW1lIjoibmdpbTE2OCIsImdpdmVuX25hbWUiOiJsZWFuZyIsImZhbWlseV9uYW1lIjoibGVhbmciLCJlbWFpbCI6ImxlYW5nbmdpbTE2OEBnbWFpbC5jb20ifQ.Es6C56hf3tuy1btV-_S7NSvhgmfIvurrTcPnu7uDz7YbQKVW3kkeTRfCCUuJwHNb3VFdgwhgkprwZ9ScT54GYZkOi5IFknZY_oUaX6XzGim3TTgYKnrdw1phN6ZytShWSCpWLwIklZyMhJH2E3_DMih5XXH_zfdyPp9w_LIUFHRbx2rkv-H9mdIusCfE7c3zHxWpdT8IB3w32R4ksiAz0n_Dxd6tWetr3EQFVChaJzpbWARJsf-heUYMhcpLiyztCIpBisiOzPdrI0Yp6HtOhgv7hGPIbBVFPyg1fzJM50wqhp3C2L77IzxubVOX2gR9LwfGxo8v7nN-GljhJDGY6gfsdgsdg eyJhbGciOiJSUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuQmNJc01nWC12SEhqS0NQOFZSTHRnd1NGcUxvMGJRSGk2cTgxa1ExTTdVIn0.eyJleHAiOjE3ODU0NjAyMTEsImlhdCI6MTc4NTQyNDIxMywiYXV0aF90aW1lIjoxNzg1NDI0MjExLCJqdGkiOiJvbnJ0YWM6NjQzZjczMTEtM2VmNS1iMmIxLTQyMDctYjUyMzA4NDg1YTkzIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNoYW5jaGhheS5zaXRlL3JlYWxtcy9pc3RhZC1mbHV4aXBvcy1hdXRoIiwiYXVkIjpbImZsdXhpcG9zLWJhY2tlbmQiLCJyZWFsbS1tYW5hZ2VtZW50IiwiYnJva2VyIiwiYWNjb3VudCJdLCJzdWIiOiIwNzlhZDQxMy1mYzRkLTRhZjctOTgwNy02ZDI5ZTg3YjE4ZGIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJmbHV4aXBvcy1jbGllbnQiLCJzaWQiOiJjNDk0NTkyMC0wYjdmLWM4MDctYWE0Ny02OGFlYmE2M2MzMGEiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHBzOi8vYm8tZGFzaGJvYXJkLWl0ZS1iYXNpYy1seWFydC52ZXJjZWwuYXBwIiwiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaHR0cHM6Ly93d3cua2V5Y2xvYWsub3JnIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLWlzdGFkLWZsdXhpcG9zLWF1dGgiLCJvZmZsaW5lX2FjY2VzcyIsIkJVU0lORVNTIiwidW1hX2F1dGhvcml6YXRpb24iLCJVU0VSIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiZmx1eGlwb3MtYmFja2VuZCI6eyJyb2xlcyI6WyJpdGVtOmNyZWF0ZSIsInN0b2NrOndyaXRlIiwibWVtYmVyOnJlYWQiLCJyb2xlOnVwZGF0ZSIsInVuaXQ6cmVhZCIsIml0ZW0tZ3JvdXA6cmVhZCIsIm9yZGVyOnJlYWQiLCJvcmRlcjpnZW5lcmF0ZS1raHFyIiwib3JkZXI6Y3JlYXRlIiwic3RvcmVmcm9udDp1cGRhdGUiLCJpdGVtOnJlYWQiLCJjdXJyZW5jeTpyZWFkIiwiaXRlbTp1cGRhdGUiLCJpdGVtLWdyb3VwOmRlbGV0ZSIsInRlbGVncmFtLXNldHRpbmc6cmVhZCIsImJha29uZy1zZXR0aW5nOnVwZGF0ZSIsImN1cnJlbmN5OnVwZGF0ZSIsIm9yZGVyOmNhbmNlbCIsInN0b2NrOnJlYWQiLCJtZW1iZXI6bWFuYWdlIiwiYnVzaW5lc3M6cmVhZCIsInRlbGVncmFtLXNldHRpbmc6dXBkYXRlIiwicm9sZTpkZWxldGUiLCJiYWtvbmctc2V0dGluZzpwcmV2aWV3IiwiY3VycmVuY3k6ZGVsZXRlIiwiaXRlbS1ncm91cDpjcmVhdGUiLCJiYWtvbmctc2V0dGluZzpyZWFkIiwib3JkZXI6cGF5IiwiYnVzaW5lc3M6dXBkYXRlIiwiYnVzaW5lc3M6ZGVsZXRlIiwiY3VycmVuY3k6c2V0LWRpc3BsYXkiLCJyb2xlOnJlYWQiLCJyb2xlOmFzc2lnbiIsImN1cnJlbmN5OmNyZWF0ZSIsInByb2ZpbGU6cmVhZCIsImJ1c2luZXNzOmNyZWF0ZSIsInN0b3JlZnJvbnQ6cmVhZCIsInJvbGU6Y3JlYXRlIiwiaXRlbTpkZWxldGUiLCJpdGVtLWdyb3VwOnVwZGF0ZSIsImN1cnJlbmN5OnNldC1iYXNlIiwicHJvZmlsZTp1cGRhdGUiXX0sInJlYWxtLW1hbmFnZW1lbnQiOnsicm9sZXMiOlsiY3JlYXRlLWNsaWVudCJdfSwiYnJva2VyIjp7InJvbGVzIjpbInJlYWQtdG9rZW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJ2aWV3LWFwcGxpY2F0aW9ucyIsInZpZXctY29uc2VudCIsInZpZXctZ3JvdXBzIiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJkZWxldGUtYWNjb3VudCIsIm1hbmFnZS1jb25zZW50Iiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZ2VuZGVyIjoiRkVNQUxFIiwibmFtZSI6ImxlYW5nIGxlYW5nIiwicHJlZmVycmVkX3VzZXJuYW1lIjoibmdpbTE2OCIsImdpdmVuX25hbWUiOiJsZWFuZyIsImZhbWlseV9uYW1lIjoibGVhbmciLCJlbWFpbCI6ImxlYW5nbmdpbTE2OEBnbWFpbC5jb20ifQ.Es6C56hf3tuy1btV-_S7NSvhgmfIvurrTcPnu7uDz7YbQKVW3kkeTRfCCUuJwHNb3VFdgwhgkprwZ9ScT54GYZkOi5IFknZY_oUaX6XzGim3TTgYKnrdw1phN6ZytShWSCpWLwIklZyMhJH2E3_DMih5XXH_zfdyPp9w_LIUFHRbx2rkv-H9mdIusCfE7c3zHxWpdT8IB3w32R4ksiAz0n_Dxd6tWetr3EQFVChaJzpbWARJsf-heUYMhcpLiyztCIpBisiOzPdrI0Yp6HtOhgv7hGPIbBVFPyg1fzJM50wqhp3C2L77IzxubVOX2gR9LwfGxo8v7nN-GljhJDGY6g"
    console.log('fsdgsdg', accessToken)
    
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
