"use server";

import type { PushSubscription as WebPushSubscription } from "web-push";

import { getCurrentSubject } from "@/lib/auth/current-subject";
import { addSubscription, removeSubscription } from "@/lib/push/subscription-store";
import { sendPushToUser, sendPushToUsers } from "@/lib/push/send-push";
import type { PushPayload } from "@/lib/push/types";

export async function subscribeUser(sub: WebPushSubscription) {
  const userId = await getCurrentSubject();

  if (!userId) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { success: false, error: "That subscription is missing required fields." };
  }

  await addSubscription({
    userId,
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    expirationTime: sub.expirationTime ?? null,
  });

  return { success: true };
}

export async function unsubscribeUser(endpoint: string) {
  const userId = await getCurrentSubject();

  if (!userId) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  await removeSubscription(userId, endpoint);

  return { success: true };
}

/**
 * Pushes to a set of recipients' phones for an event this dashboard's own
 * client code just triggered (a sale, a parked order).
 *
 * Every call site pairs this with the existing `createNotification` mutation
 * so the bell and the phone always agree — see `useNotifyWithPush`. Requires
 * only that *someone* is signed in, the same as `createNotification` itself;
 * which receivers are legitimate for that user to notify is the backend's
 * call to make on that request, not this one's.
 */
export async function notifyUsersPush(
  receiverIds: string[],
  payload: PushPayload,
) {
  const callerId = await getCurrentSubject();

  if (!callerId) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  try {
    await sendPushToUsers(receiverIds, payload);
    return { success: true };
  } catch (error) {
    console.error("Push notification error:", error);
    return { success: false, error: "Failed to send push notification." };
  }
}

/** Rings the current user's own devices — the PWA settings page's "Send test" button. */
export async function sendTestNotification(message: string) {
  const userId = await getCurrentSubject();

  if (!userId) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  try {
    const result = await sendPushToUser(userId, {
      title: "FluxiBiz",
      body: message,
      url: "/",
    });

    if (result.sent === 0) {
      return {
        success: false,
        error:
          result.pruned > 0
            ? "That subscription is no longer valid — subscribe again."
            : "No devices are subscribed yet.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Push notification error:", error);

    const detail =
      error instanceof Error && "statusCode" in error
        ? ` (${(error as { statusCode?: number }).statusCode})`
        : "";

    return {
      success: false,
      error: `Failed to send notification${detail}. Check the server logs.`,
    };
  }
}
