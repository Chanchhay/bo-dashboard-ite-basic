import {
    applySetCookies,
    parseCookies,
    parseSetCookieHeader,
    toCookieOptions,
} from "better-auth/cookies";

import { auth } from "@/lib/auth/auth";

/*
 * Keycloak access tokens, refreshed exactly once per generation.
 *
 * This app runs Better Auth without a database, so the Keycloak tokens live in
 * the `account_data` cookie. `auth.api.getAccessToken()` refreshes them when
 * they are near expiry and writes the rotated pair back as a `Set-Cookie` —
 * which is where two things go wrong on Next.js App Router, and why nothing
 * calls that endpoint directly any more:
 *
 * 1. A Server Component cannot set cookies: its response headers are already
 *    committed by the time it renders. Better Auth's `nextCookies()` hook
 *    swallows the failure, so the refresh succeeds against Keycloak and the
 *    browser never hears about it. The next request replays the *same* cookie,
 *    Keycloak sees an already-redeemed refresh token, and every request from
 *    then on fails. See better-auth#7394.
 * 2. Requests are concurrent. A page that fires five `/api/*` calls at once
 *    hands the same refresh token to five exchanges. Keycloak's one-time-use
 *    rule lets one through and — with reuse detection on — can revoke the
 *    whole session for the rest.
 *
 * The answer to both is to make rotation a property of the server rather than
 * of a single request. Every account-cookie value the server has seen maps to
 * a `TokenChain`: the newest tokens that value ultimately led to. A request
 * arriving with a superseded cookie is served from its chain instead of being
 * sent to Keycloak with a spent refresh token, and one in-flight rotation is
 * shared by every caller waiting on it.
 *
 * `src/proxy.ts` refreshes ahead of rendering so page navigations never rely
 * on a Server Component being able to persist the result, and route handlers
 * persist what they are given. The chain is what keeps the two consistent
 * while a browser catches up.
 */

const PROVIDER_ID = "keycloak";

/**
 * Treat a token as spent this far ahead of its expiry. Covers clock skew
 * between us, Keycloak and the backend, plus the flight time of the request
 * the token is about to be spent on.
 */
const EXPIRY_SKEW_MS = 5_000;

/** Chains to keep before sweeping. Sized for far more concurrent sessions than this app sees. */
const MAX_TRACKED_CHAINS = 500;

/**
 * How long an abandoned chain (a signed-out user, a replaced login) is kept
 * once its access token has expired. Long enough that a browser still holding
 * an older cookie generation can be answered from it.
 */
const STALE_CHAIN_GRACE_MS = 10 * 60 * 1000;

type TokenChain = {
    /** Request headers carrying the newest account cookie this server knows of. */
    headers: Headers;
    /** The account-cookie value those headers carry — the newest generation. */
    key: string | null;
    accessToken: string;
    /** Epoch milliseconds. */
    expiresAt: number;
    /** The `Set-Cookie` values that move a browser onto the newest generation. */
    setCookies: string[];
    /** In-flight rotation, so concurrent callers redeem one refresh token once. */
    rotating: Promise<void> | null;
};

export type ResolvedAccessToken = {
    accessToken: string;
    /**
     * Hand to {@link persistAuthCookies} from anywhere that can still write
     * response headers. Empty when the browser is already up to date.
     */
    setCookies: string[];
};

export class KeycloakTokenError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "KeycloakTokenError";
    }
}

/** Keyed by account-cookie value — every generation that leads to these tokens. */
const chains = new Map<string, TokenChain>();

/** First exchange for a cookie value, shared while it is in flight. */
const opening = new Map<string, Promise<TokenChain>>();

async function accountCookieName() {
    const context = await auth.$context;
    return context.authCookies.accountData.name;
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

function isFresh(chain: TokenChain) {
    return chain.expiresAt - Date.now() > EXPIRY_SKEW_MS;
}

type Exchange = {
    headers: Headers;
    accessToken: string;
    expiresAt: number;
    setCookies: string[];
    /** The account cookie the exchange produced, when it rotated one. */
    key: string | null;
};

/**
 * One trip through Better Auth: returns the current token, refreshing against
 * Keycloak first when it is close to expiry. `returnHeaders` is what makes the
 * rotated cookie visible to us — the `nextCookies()` hook can only persist it
 * where response headers are still open, which is exactly the case this module
 * cannot assume.
 */
async function exchange(
    headers: Headers,
    cookieName: string,
): Promise<Exchange> {
    const { headers: responseHeaders, response } =
        await auth.api.getAccessToken({
            headers,
            body: { providerId: PROVIDER_ID },
            returnHeaders: true,
        });

    if (!response?.accessToken) {
        throw new KeycloakTokenError(
            "Keycloak did not return an access token.",
            401,
        );
    }

    const setCookies = responseHeaders.getSetCookie();
    const nextHeaders = new Headers(headers);

    if (setCookies.length > 0) {
        applySetCookies(nextHeaders, setCookies);
    }

    const expiresAt = response.accessTokenExpiresAt
        ? new Date(response.accessTokenExpiresAt).getTime()
        : 0;

    return {
        headers: nextHeaders,
        accessToken: response.accessToken,
        // An expiry we cannot read is treated as spent, so the next caller
        // refreshes rather than trusting a token of unknown age.
        expiresAt: Number.isNaN(expiresAt) ? 0 : expiresAt,
        setCookies,
        key: readAccountCookie(nextHeaders, cookieName),
    };
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

async function openChain(
    key: string,
    headers: Headers,
    cookieName: string,
): Promise<TokenChain> {
    const pending = opening.get(key);

    if (pending) return pending;

    const promise = (async () => {
        const opened = await exchange(headers, cookieName);
        const chain: TokenChain = {
            headers: opened.headers,
            key: opened.key,
            accessToken: opened.accessToken,
            expiresAt: opened.expiresAt,
            setCookies: opened.setCookies,
            rotating: null,
        };

        remember(key, chain);

        // The generation this produced resolves to the same chain, so a
        // browser that *did* receive the new cookie lands here rather than
        // opening a second chain that would redeem the token again.
        if (opened.key && opened.key !== key) remember(opened.key, chain);

        return chain;
    })().finally(() => {
        opening.delete(key);
    });

    opening.set(key, promise);

    return promise;
}

async function rotate(chain: TokenChain, cookieName: string) {
    if (!chain.rotating) {
        chain.rotating = (async () => {
            const rotated = await exchange(chain.headers, cookieName);

            chain.headers = rotated.headers;
            chain.key = rotated.key;
            chain.accessToken = rotated.accessToken;
            chain.expiresAt = rotated.expiresAt;

            // Keep the last cookies we were given when this exchange rotated
            // nothing: a browser that missed the earlier `Set-Cookie` still
            // needs it, and only the newest generation is redeemable.
            if (rotated.setCookies.length > 0) {
                chain.setCookies = rotated.setCookies;
            }

            if (rotated.key) remember(rotated.key, chain);
        })().finally(() => {
            chain.rotating = null;
        });
    }

    await chain.rotating;
}

function asTokenError(error: unknown) {
    if (error instanceof KeycloakTokenError) return error;

    const status =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
            ? error.statusCode
            : 401;

    if (status === 401) {
        return new KeycloakTokenError("Your session has expired.", 401);
    }

    return new KeycloakTokenError(
        "Unable to refresh the Keycloak access token.",
        401,
    );
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
    const cookieName = await accountCookieName();
    const key = readAccountCookie(requestHeaders, cookieName);

    try {
        if (!key) {
            // No account cookie to chain from. Better Auth still knows whether
            // there is a session, so let it produce the error.
            const opened = await exchange(requestHeaders, cookieName);
            return {
                accessToken: opened.accessToken,
                setCookies: opened.setCookies,
            };
        }

        let chain = chains.get(key);

        if (!chain) {
            chain = await openChain(key, requestHeaders, cookieName);
        } else if (!isFresh(chain)) {
            await rotate(chain, cookieName);
        }

        return {
            accessToken: chain.accessToken,
            // A caller already on the newest generation needs no cookie; only
            // one that is behind does.
            setCookies: key === chain.key ? [] : chain.setCookies,
        };
    } catch (error) {
        throw asTokenError(error);
    }
}

/**
 * Drops the cached token for this cookie and resolves again, forcing a trip to
 * Keycloak. For the one case freshness cannot cover: the backend rejecting a
 * token we still believed in.
 */
export async function renewKeycloakAccessToken(
    requestHeaders: Headers,
): Promise<ResolvedAccessToken> {
    const cookieName = await accountCookieName();
    const key = readAccountCookie(requestHeaders, cookieName);
    const chain = key ? chains.get(key) : undefined;

    if (chain) chain.expiresAt = 0;

    return resolveKeycloakAccessToken(requestHeaders);
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
