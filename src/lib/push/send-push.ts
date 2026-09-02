import webpush from "web-push";

import {
  getSubscriptionsForUsers,
  removeByEndpoint,
} from "./subscription-store";
import type { PushPayload, SendPushResult, StoredPushSubscription } from "./types";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys are not configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).",
    );
  }

  webpush.setVapidDetails(
    "mailto:ipos.istad@gmail.com",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
}

function toWebPushSubscription(record: StoredPushSubscription) {
  return {
    endpoint: record.endpoint,
    keys: record.keys,
  };
}

/**
 * Wakes every device a user has installed this app on.
 *
 * Fired for a business event (a sale, a channel order) that has no bearing
 * on whether a phone is reachable — one dead registration among several
 * devices must not stop the others, so every send runs concurrently and is
 * judged on its own. A 404/410 means the push service itself has forgotten
 * that endpoint (the user uninstalled, or the browser rotated it); anything
 * else (a bad payload, an offline push service, a quota) is left for the
 * caller to see in the count rather than silently eaten.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<SendPushResult> {
  if (userIds.length === 0) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  ensureVapidConfigured();

  const subscriptions = await getSubscriptionsForUsers(userIds);

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/pwa/icon-192x192.png",
    url: payload.url ?? "/",
    tag: payload.tag,
  });

  const outcomes = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(toWebPushSubscription(subscription), body).then(
        () => ({ subscription, ok: true as const }),
        (error: unknown) => ({ subscription, ok: false as const, error }),
      ),
    ),
  );

  let sent = 0;
  let failed = 0;
  const pruning: Promise<void>[] = [];

  for (const outcome of outcomes) {
    // Promise.allSettled never rejects the outer promise; the inner handlers
    // above always resolve, so every entry lands here as "fulfilled".
    if (outcome.status !== "fulfilled") {
      failed += 1;
      continue;
    }

    const result = outcome.value;

    if (result.ok) {
      sent += 1;
      continue;
    }

    const statusCode = (result.error as { statusCode?: number })?.statusCode;

    if (statusCode === 404 || statusCode === 410) {
      pruning.push(removeByEndpoint(result.subscription.endpoint));
    } else {
      failed += 1;
      console.error("[push] send failed:", result.error);
    }
  }

  await Promise.all(pruning);

  return { sent, failed, pruned: pruning.length };
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  return sendPushToUsers([userId], payload);
}
