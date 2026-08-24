import { applySetCookies, parseCookies, parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { symmetricDecodeJWT, symmetricEncodeJWT } from "better-auth/crypto";

import { auth } from "@/lib/auth/auth";

/*
 * Keycloak access tokens: refreshed here, once per generation.
 *
 * This app runs Better Auth without a database, so the Keycloak tokens live in
 * the `account_data` cookie rather than a table. That makes the cookie the
 * only copy, and it is why refreshing is this app's problem rather than the
 * library's — two things go wrong otherwise:
 *
 * 1. A Server Component cannot set cookies: its response headers are already
 *    committed by the time it renders. `nextCookies()` swallows the failed
 *    write, so a refresh that ran during a render succeeds against Keycloak
 *    and the browser never hears about it. The next request replays the same
 *    cookie, Keycloak sees an already-redeemed refresh token, and every
 *    request from then on fails. See better-auth#7394.
 * 2. Requests are concurrent. A page firing five `/api/*` calls at once hands
 *    the same refresh token to five exchanges. Keycloak's one-time-use rule
 *    lets one through, and with reuse detection on it can revoke the session
 *    for the rest.
 *
 * Both are answered by making rotation a property of the server rather than of
 * a single request. Every account-cookie value the server has seen maps to a
 * `TokenChain` holding the newest tokens that value led to. A request arriving
 * with a superseded cookie is served from its chain instead of being sent to
 * Keycloak with a spent refresh token, and one in-flight refresh is shared by
 * every caller waiting on it. `src/proxy.ts` refreshes ahead of rendering, and
 * route handlers persist what they are given; the chain is what keeps the two
 * consistent while a browser catches up.
 *
 * The token endpoint is called directly rather than through
 * `auth.api.getAccessToken()`. That endpoint refreshes only inside the last
 * five seconds of a token's life — a window this app cannot hit reliably — and
 * reports every failure as one opaque message, which is no way to run an auth
 * flow you have to debug. The cookie it reads and writes is the same one, in
 * the same format, using Better Auth's own encryption helpers.
 */

/**
 * Refresh once a token has this little life left. Wide enough that a token
 * handed out here survives the request it was fetched for, including a slow
 * render that makes several backend calls in sequence.
 */
const REFRESH_WINDOW_MS = 10_000;

/** Chains to keep before sweeping. Sized well past this app's concurrent sessions. */
const MAX_TRACKED_CHAINS = 500;

/**
 * How long an abandoned chain (a signed-out user, a replaced login) is kept
 * once its access token has expired, so a browser still holding an older
 * cookie generation can be answered from it.
 */
const STALE_CHAIN_GRACE_MS = 10 * 60 * 1000;

/**
 * Conservative per-cookie ceiling. Safari's ~4093-byte floor is the lowest in
 * use; the headroom covers the attributes written alongside the value.
 */
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
    /**
     * Hand to {@link persistAuthCookies} from anywhere that can still write
     * response headers. Empty when the browser is already up to date.
     */
    setCookies: string[];
};

/** The account cookie's payload, kept whole so nothing is dropped on re-encode. */
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
    /** Request headers carrying the newest account cookie this server knows of. */
    headers: Headers;
    /** The account-cookie value those headers carry — the newest generation. */
    key: string;
    accessToken: string;
    /** Epoch milliseconds. */
    expiresAt: number;
    /** `Set-Cookie` values that move a browser onto the newest generation. */
    setCookies: string[];
    /** In-flight refresh, so concurrent callers redeem one refresh token once. */
    refreshing: Promise<void> | null;
};

/** Keyed by account-cookie value — every generation that leads to these tokens. */
const chains = new Map<string, TokenChain>();

/** First read of a cookie value, shared while it is in flight. */
const opening = new Map<string, Promise<TokenChain>>();

/*
 * Everything needed to read and write the account cookie, taken from the live
 * Better Auth context so the cookie name, encryption secret and lifetime can
 * never drift from what the library itself would use.
 */
let settingsPromise: Promise<{
    cookieName: string;
    attributes: CookieAttributes;
    secretConfig: Parameters<typeof symmetricEncodeJWT>[1];
}> | null = null;

function authSettings() {
    settingsPromise ??= (async () => {
        const context = await auth.$context;

        // Cast because the context narrows `options` to this app's literal
        // config, where `account` is currently absent — the guard exists for
        // the day it is not.
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

/** Resolved once per process — the realm's token endpoint never moves. */
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
            // Discovery is a convenience. Every realm serves the token
            // endpoint at the standard path, so an unreachable discovery
            // document must not be the reason a session cannot be refreshed.
        }

        return `${issuer}/protocol/openid-connect/token`;
    })().catch((error) => {
        // Don't cache a failure: a lookup that lost the network would
        // otherwise poison every refresh for the life of the process.
        tokenEndpointPromise = null;
        throw error;
    });

    return tokenEndpointPromise;
}

/**
 * The account cookie's value, reassembled from the numbered chunks Better Auth
 * splits it into once the encrypted tokens outgrow a single cookie.
 */
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

/**
 * The `Set-Cookie` values that replace the account cookie, split across
 * numbered chunks when the encrypted payload outgrows one cookie and expiring
 * whichever cookies the previous generation used but this one does not.
 */
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

    // A generation that needed three chunks followed by one that needs two
    // would otherwise leave `.2` behind, and the stale tail would be read back
    // as part of the new value.
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

/**
 * Redeems a refresh token at Keycloak.
 *
 * Failures are reported with what Keycloak actually said. `invalid_grant`
 * means the token was already redeemed or the session has gone — the two
 * cases worth telling apart when this flow misbehaves.
 */
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

    // Omitted rather than sent empty: this realm's client is public, and
    // Keycloak rejects a blank secret outright.
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
        // A token of unknown age is treated as already due, so the next caller
        // refreshes rather than trusting it.
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

/**
 * Reads the account cookie these headers carry and returns a token that is
 * good now, refreshing at Keycloak and re-encoding the cookie when it is not.
 */
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

    // `iat`, `exp` and `jti` belong to the envelope being replaced, not to the
    // account, and re-encoding them would pin the new cookie to the old life.
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

    // Still over budget: drop by insertion order, which `Map` iterates first.
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

        // The generation this produced resolves to the same chain, so a
        // browser that did receive the new cookie lands here rather than
        // opening a second chain that would redeem the token again.
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

        // Keep the cookies from the last exchange that rotated one: a browser
        // that missed that `Set-Cookie` still needs it, and only the newest
        // generation is redeemable.
        if (refreshed.setCookies.length > 0) {
            chain.setCookies = refreshed.setCookies;
        }

        remember(refreshed.key, chain);
    })().finally(() => {
        chain.refreshing = null;
    });

    await chain.refreshing;
}

/**
 * A Keycloak access token that is valid now, refreshing it first when needed.
 *
 * Concurrent callers holding the same account cookie share one refresh, and a
 * caller holding a superseded cookie is served from the generation that
 * replaced it — neither ever hands Keycloak a spent refresh token.
 */
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
        // A caller already on the newest generation needs no cookie; only one
        // that is behind does.
        setCookies: key === chain.key ? [] : chain.setCookies,
    };
}

/**
 * Drops the cached token for this cookie and resolves again, forcing a trip to
 * Keycloak. For the one case freshness cannot cover: the backend rejecting a
 * token we still believed in.
 */
export async function renewKeycloakAccessToken(
    requestHeaders: Headers,
): Promise<ResolvedAccessToken> {
    const { cookieName } = await authSettings();
    const key = readAccountCookie(requestHeaders, cookieName);
    const chain = key ? chains.get(key) : undefined;

    if (chain) chain.expiresAt = 0;

    return resolveKeycloakAccessToken(requestHeaders);
}

/**
 * `Set-Cookie` values that clear every Better Auth cookie this request carries,
 * chunks included.
 *
 * Used when a refresh fails for good. Leaving the session cookie in place would
 * be worse than useless: the proxy sends a request holding one straight back to
 * `/dashboard`, so a browser whose tokens are dead would bounce between the
 * dashboard and the login page instead of signing in again.
 */
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

/**
 * Writes rotated auth cookies onto the outgoing response.
 *
 * A no-op during a Server Component render, where the headers are already
 * committed — `src/proxy.ts` has refreshed ahead of that, so there is nothing
 * left to persist there.
 */
export async function persistAuthCookies(setCookies: string[]) {
    if (setCookies.length === 0) return;

    try {
        // Imported here rather than at module scope: this module is also
        // loaded by the proxy, which runs outside the request-scope APIs.
        const { cookies } = await import("next/headers");
        const store = await cookies();

        for (const value of setCookies) {
            for (const [name, attributes] of parseSetCookieHeader(value)) {
                store.set(name, attributes.value, toCookieOptions(attributes));
            }
        }
    } catch {
        // Nothing can be written from here; the browser keeps its current
        // generation and the chain keeps answering for it.
    }
}
