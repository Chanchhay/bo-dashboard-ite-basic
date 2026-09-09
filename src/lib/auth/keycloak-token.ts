import { applySetCookies, parseCookies, parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { symmetricDecodeJWT, symmetricEncodeJWT } from "better-auth/crypto";

import { auth } from "@/lib/auth/auth";

const REFRESH_WINDOW_MS = 10_000;

const MAX_TRACKED_CHAINS = 500;

const STALE_CHAIN_GRACE_MS = 10 * 60 * 1000;

const MAX_COOKIE_VALUE = 3_500;

export class KeycloakTokenError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "KeycloakTokenError";
    }
}

export type ResolvedAccessToken = {
    accessToken: string;
    setCookies: string[];
};

type AccountData = Record<string, unknown> & {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: string;
    refreshTokenExpiresAt?: string;
    idToken?: string;
};

type CookieAttributes = {
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string | boolean;
};

type TokenChain = {
    headers: Headers;
    key: string;
    accessToken: string;
    expiresAt: number;
    setCookies: string[];
    refreshing: Promise<void> | null;
};

const chains = new Map<string, TokenChain>();

const opening = new Map<string, Promise<TokenChain>>();

let settingsPromise: Promise<{
    cookieName: string;
    attributes: CookieAttributes;
    secretConfig: Parameters<typeof symmetricEncodeJWT>[1];
}> | null = null;

function authSettings() {
    settingsPromise ??= (async () => {
        const context = await auth.$context;

        const account = (
            context.options as { account?: { encryptOAuthTokens?: boolean } }
        ).account;

        if (account?.encryptOAuthTokens) {
            throw new KeycloakTokenError(
                "account.encryptOAuthTokens is enabled; this module reads the tokens in the clear.",
                500,
            );
        }

        return {
            cookieName: context.authCookies.accountData.name,
            attributes: context.authCookies.accountData
                .attributes as CookieAttributes,
            secretConfig: context.secretConfig,
        };
    })();

    return settingsPromise;
}

let tokenEndpointPromise: Promise<string> | null = null;

function issuerUrl() {
    const issuer =
        process.env.KEYCLOAK_ISSUER ||
        (process.env.NEXT_PUBLIC_KEYCLOAK_URL &&
        process.env.NEXT_PUBLIC_KEYCLOAK_REALM
            ? `${process.env.NEXT_PUBLIC_KEYCLOAK_URL.replace(/\/+$/, "")}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM.replace(/^\/+|\/+$/g, "")}`
            : "");

    return issuer.replace(/\/+$/, "");
}

function tokenEndpoint() {
    tokenEndpointPromise ??= (async () => {
        const issuer = issuerUrl();

        if (!issuer) {
            throw new KeycloakTokenError(
                "Keycloak is not configured on the server.",
                500,
            );
        }

        try {
            const response = await fetch(
                `${issuer}/.well-known/openid-configuration`,
                { cache: "no-store" },
            );

            if (response.ok) {
                const document = (await response.json()) as {
                    token_endpoint?: string;
                };

                if (document.token_endpoint) return document.token_endpoint;
            }
        } catch {
        }

        return `${issuer}/protocol/openid-connect/token`;
    })().catch((error) => {
        tokenEndpointPromise = null;
        throw error;
    });

    return tokenEndpointPromise;
}

function readAccountCookie(headers: Headers, cookieName: string): string | null {
    const cookies = parseCookies(headers.get("cookie") ?? "");
    const whole = cookies.get(cookieName);

    if (whole) return whole;

    const chunks: { index: number; value: string }[] = [];

    for (const [name, value] of cookies) {
        if (!name.startsWith(`${cookieName}.`)) continue;

        const index = Number.parseInt(name.slice(cookieName.length + 1), 10);

        if (Number.isNaN(index)) continue;

        chunks.push({ index, value });
    }

    if (chunks.length === 0) return null;

    chunks.sort((a, b) => a.index - b.index);

    return chunks.map((chunk) => chunk.value).join("") || null;
}

function serializeCookie(
    name: string,
    value: string,
    attributes: CookieAttributes,
) {
    const parts = [`${name}=${value}`];

    if (attributes.maxAge !== undefined) parts.push(`Max-Age=${attributes.maxAge}`);
    if (attributes.path) parts.push(`Path=${attributes.path}`);
    if (attributes.domain) parts.push(`Domain=${attributes.domain}`);
    if (attributes.sameSite && typeof attributes.sameSite === "string") {
        parts.push(
            `SameSite=${attributes.sameSite[0].toUpperCase()}${attributes.sameSite.slice(1)}`,
        );
    }
    if (attributes.secure) parts.push("Secure");
    if (attributes.httpOnly) parts.push("HttpOnly");

    return parts.join("; ");
}

function accountSetCookies(
    headers: Headers,
    value: string,
    { cookieName, attributes }: { cookieName: string; attributes: CookieAttributes },
) {
    const written = new Map<string, string>();

    if (value.length <= MAX_COOKIE_VALUE) {
        written.set(cookieName, value);
    } else {
        for (let start = 0, index = 0; start < value.length; start += MAX_COOKIE_VALUE, index++) {
            written.set(
                `${cookieName}.${index}`,
                value.slice(start, start + MAX_COOKIE_VALUE),
            );
        }
    }

    const setCookies = Array.from(written, ([name, chunk]) =>
        serializeCookie(name, chunk, attributes),
    );

    for (const [name] of parseCookies(headers.get("cookie") ?? "")) {
        if (name !== cookieName && !name.startsWith(`${cookieName}.`)) continue;
        if (written.has(name)) continue;

        setCookies.push(
            serializeCookie(name, "", { ...attributes, maxAge: 0 }),
        );
    }

    return setCookies;
}

function toEpoch(value: unknown) {
    if (!value) return 0;

    const time = new Date(value as string).getTime();

    return Number.isNaN(time) ? 0 : time;
}

type KeycloakTokens = {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt?: number;
};

async function refreshWithKeycloak(
    refreshToken: string,
): Promise<KeycloakTokens> {
    const clientId =
        process.env.KEYCLOAK_CLIENT_ID ||
        process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
        "";
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
    });

    if (clientSecret) body.set("client_secret", clientSecret);

    const response = await fetch(await tokenEndpoint(), {
        method: "POST",
        cache: "no-store",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
        },
        body,
    });

    const payload = (await response.json().catch(() => null)) as {
        access_token?: string;
        refresh_token?: string;
        id_token?: string;
        expires_in?: number;
        refresh_expires_in?: number;
        error?: string;
        error_description?: string;
    } | null;

    if (!response.ok || !payload?.access_token) {
        const detail = payload?.error
            ? `${payload.error}${payload.error_description ? `: ${payload.error_description}` : ""}`
            : `HTTP ${response.status}`;

        console.error(`[keycloak] refresh_token grant rejected — ${detail}`);

        throw new KeycloakTokenError(
            `Keycloak refused to refresh the session (${detail}).`,
            401,
        );
    }

    const now = Date.now();

    return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        idToken: payload.id_token,
        accessTokenExpiresAt: payload.expires_in
            ? now + payload.expires_in * 1000
            : 0,
        refreshTokenExpiresAt: payload.refresh_expires_in
            ? now + payload.refresh_expires_in * 1000
            : undefined,
    };
}

type Exchange = {
    headers: Headers;
    key: string;
    accessToken: string;
    expiresAt: number;
    setCookies: string[];
};

async function exchange(headers: Headers): Promise<Exchange> {
    const settings = await authSettings();
    const cookieValue = readAccountCookie(headers, settings.cookieName);

    if (!cookieValue) {
        throw new KeycloakTokenError("Your session has expired.", 401);
    }

    const account = (await symmetricDecodeJWT(
        cookieValue,
        settings.secretConfig,
        "better-auth-account",
    )) as AccountData | null;

    if (!account) {
        throw new KeycloakTokenError("Your session has expired.", 401);
    }

    const expiresAt = toEpoch(account.accessTokenExpiresAt);

    if (account.accessToken && expiresAt - Date.now() > REFRESH_WINDOW_MS) {
        return {
            headers,
            key: cookieValue,
            accessToken: account.accessToken,
            expiresAt,
            setCookies: [],
        };
    }

    if (!account.refreshToken) {
        throw new KeycloakTokenError("Your session has expired.", 401);
    }

    const tokens = await refreshWithKeycloak(account.refreshToken);

    const updated: AccountData = {
        ...account,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? account.refreshToken,
        accessTokenExpiresAt: new Date(tokens.accessTokenExpiresAt).toISOString(),
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt
            ? new Date(tokens.refreshTokenExpiresAt).toISOString()
            : account.refreshTokenExpiresAt,
        idToken: tokens.idToken ?? account.idToken,
    };

    delete updated.iat;
    delete updated.exp;
    delete updated.jti;

    const value = await symmetricEncodeJWT(
        updated,
        settings.secretConfig,
        "better-auth-account",
        settings.attributes.maxAge ?? 604_800,
    );

    const setCookies = accountSetCookies(headers, value, settings);
    const nextHeaders = new Headers(headers);
    applySetCookies(nextHeaders, setCookies);

    return {
        headers: nextHeaders,
        key: value,
        accessToken: tokens.accessToken,
        expiresAt: tokens.accessTokenExpiresAt,
        setCookies,
    };
}

function isFresh(chain: TokenChain) {
    return chain.expiresAt - Date.now() > REFRESH_WINDOW_MS;
}

function remember(key: string, chain: TokenChain) {
    chains.set(key, chain);

    if (chains.size <= MAX_TRACKED_CHAINS) return;

    const cutoff = Date.now() - STALE_CHAIN_GRACE_MS;

    for (const [tracked, value] of chains) {
        if (value.expiresAt < cutoff) chains.delete(tracked);
    }

    for (const tracked of chains.keys()) {
        if (chains.size <= MAX_TRACKED_CHAINS) break;
        chains.delete(tracked);
    }
}

async function openChain(key: string, headers: Headers) {
    const pending = opening.get(key);

    if (pending) return pending;

    const promise = (async () => {
        const opened = await exchange(headers);
        const chain: TokenChain = {
            headers: opened.headers,
            key: opened.key,
            accessToken: opened.accessToken,
            expiresAt: opened.expiresAt,
            setCookies: opened.setCookies,
            refreshing: null,
        };

        remember(key, chain);

        if (opened.key !== key) remember(opened.key, chain);

        return chain;
    })().finally(() => {
        opening.delete(key);
    });

    opening.set(key, promise);

    return promise;
}

async function refreshChain(chain: TokenChain) {
    chain.refreshing ??= (async () => {
        const refreshed = await exchange(chain.headers);

        chain.headers = refreshed.headers;
        chain.key = refreshed.key;
        chain.accessToken = refreshed.accessToken;
        chain.expiresAt = refreshed.expiresAt;

        if (refreshed.setCookies.length > 0) {
            chain.setCookies = refreshed.setCookies;
        }

        remember(refreshed.key, chain);
    })().finally(() => {
        chain.refreshing = null;
    });

    await chain.refreshing;
}

export async function resolveKeycloakAccessToken(
    requestHeaders: Headers,
): Promise<ResolvedAccessToken> {
    const { cookieName } = await authSettings();
    const key = readAccountCookie(requestHeaders, cookieName);

    if (!key) throw new KeycloakTokenError("Your session has expired.", 401);

    let chain = chains.get(key);

    if (!chain) {
        chain = await openChain(key, requestHeaders);
    } else if (!isFresh(chain)) {
        await refreshChain(chain);
    }

    return {
        accessToken: chain.accessToken,
        setCookies: key === chain.key ? [] : chain.setCookies,
    };
}

export async function renewKeycloakAccessToken(
    requestHeaders: Headers,
): Promise<ResolvedAccessToken> {
    const { cookieName } = await authSettings();
    const key = readAccountCookie(requestHeaders, cookieName);
    const chain = key ? chains.get(key) : undefined;

    if (chain) chain.expiresAt = 0;

    return resolveKeycloakAccessToken(requestHeaders);
}

export async function expiredAuthCookies(requestHeaders: Headers) {
    const context = await auth.$context;
    const known = [
        context.authCookies.sessionToken,
        context.authCookies.sessionData,
        context.authCookies.accountData,
    ];

    const expired: string[] = [];

    for (const [name] of parseCookies(requestHeaders.get("cookie") ?? "")) {
        const cookie = known.find(
            (candidate) =>
                name === candidate.name || name.startsWith(`${candidate.name}.`),
        );

        if (!cookie) continue;

        expired.push(
            serializeCookie(name, "", {
                ...(cookie.attributes as CookieAttributes),
                maxAge: 0,
            }),
        );
    }

    return expired;
}

export async function persistAuthCookies(setCookies: string[]) {
    if (setCookies.length === 0) return;

    try {
        const { cookies } = await import("next/headers");
        const store = await cookies();

        for (const value of setCookies) {
            for (const [name, attributes] of parseSetCookieHeader(value)) {
                store.set(name, attributes.value, toCookieOptions(attributes));
            }
        }
    } catch {
    }
}
