import { backendRequest } from "@/lib/api/backend";
import type { StoredPushSubscription } from "./types";

/**
 * Where push registrations live.
 *
 * This used to be a JSON file mirrored to disk on this process's own
 * filesystem — workable on a single long-running server, but silently empty
 * on a serverless deployment (Vercel included): each invocation can land on
 * a different instance, each with its own disk, so a subscription written by
 * one request was invisible to the next. The backend already has a real
 * database and is already the other end of this conversation — it is the
 * one that calls `/api/push/send` in the first place — so subscriptions are
 * rows there now, reached over `/api/v1/push-subscriptions` (a signed-in
 * user registering their own device) and `/api/v1/internal/push-subscriptions`
 * (this server asking who is subscribed, with no user session in the loop —
 * gated on `PUSH_INTERNAL_SECRET` instead, the same secret the backend sends
 * the other direction to reach `/api/push/send`).
 */

function internalPushHeaders(): HeadersInit {
    const secret = process.env.PUSH_INTERNAL_SECRET;

    if (!secret) {
        throw new Error("PUSH_INTERNAL_SECRET is not configured on this server.");
    }

    return {
        "Content-Type": "application/json",
        "X-Push-Secret": secret,
    };
}

function getApiBaseUrl() {
    const baseUrl = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");

    if (!baseUrl) {
        throw new Error("API_BASE_URL is not configured on this server.");
    }

    return baseUrl;
}

type BackendSubscription = {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    expirationTime: number | null;
};

function toStored(record: BackendSubscription): StoredPushSubscription {
    return {
        userId: record.userId,
        endpoint: record.endpoint,
        keys: { p256dh: record.p256dh, auth: record.auth },
        expirationTime: record.expirationTime,
    };
}

/**
 * Registers the caller's own device.
 *
 * Goes through `backendRequest`, which resolves the signed-in user's
 * Keycloak token from the current request — the backend derives whose
 * subscription this is from that token rather than trusting a userId this
 * call might otherwise be asked to pass, so a signed-in user can only ever
 * register their own.
 */
export async function addSubscription(subscription: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    expirationTime?: number | null;
}): Promise<void> {
    await backendRequest("/api/v1/push-subscriptions", {
        method: "POST",
        body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            expirationTime: subscription.expirationTime ?? null,
        }),
    });
}

export async function removeSubscription(
    _userId: string,
    endpoint: string,
): Promise<void> {
    await backendRequest("/api/v1/push-subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint }),
    });
}

/**
 * Drops a dead registration wherever it is — used to prune a 404/410 from
 * the push service. Called from `send-push.ts`, which runs both from a
 * signed-in Server Action and from the secret-authenticated
 * `/api/push/send` webhook with no session at all, so this always goes
 * through the internal, secret-gated door rather than the per-user one.
 */
export async function removeByEndpoint(endpoint: string): Promise<void> {
    const response = await fetch(
        `${getApiBaseUrl()}/api/v1/internal/push-subscriptions/by-endpoint?endpoint=${encodeURIComponent(endpoint)}`,
        { method: "DELETE", headers: internalPushHeaders(), cache: "no-store" },
    );

    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to prune push subscription (${response.status}).`);
    }
}

/**
 * Looks up subscriptions for a set of recipients — the one lookup with no
 * signed-in user to scope it to (the caller is asking on someone else's
 * behalf, or is the backend's own webhook), so it goes through the same
 * secret-gated internal endpoint as `removeByEndpoint`.
 */
export async function getSubscriptionsForUsers(
    userIds: string[],
): Promise<StoredPushSubscription[]> {
    if (userIds.length === 0) return [];

    const response = await fetch(
        `${getApiBaseUrl()}/api/v1/internal/push-subscriptions/lookup`,
        {
            method: "POST",
            headers: internalPushHeaders(),
            body: JSON.stringify([...new Set(userIds)]),
            cache: "no-store",
        },
    );

    if (!response.ok) {
        throw new Error(`Failed to look up push subscriptions (${response.status}).`);
    }

    const records = (await response.json()) as BackendSubscription[];
    return records.map(toStored);
}

export async function getSubscriptionsForUser(
    userId: string,
): Promise<StoredPushSubscription[]> {
    return getSubscriptionsForUsers([userId]);
}
