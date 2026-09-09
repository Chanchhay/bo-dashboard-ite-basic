import { backendRequest } from "@/lib/api/backend";
import type { StoredPushSubscription } from "./types";

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

export async function removeByEndpoint(endpoint: string): Promise<void> {
    const response = await fetch(
        `${getApiBaseUrl()}/api/v1/internal/push-subscriptions/by-endpoint?endpoint=${encodeURIComponent(endpoint)}`,
        { method: "DELETE", headers: internalPushHeaders(), cache: "no-store" },
    );

    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to prune push subscription (${response.status}).`);
    }
}

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
