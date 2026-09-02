"use client";

import { useEffect, useState } from "react";

import { subscribeUser, unsubscribeUser } from "@/app/actions";
import { getNotificationPermission } from "@/components/pwa/pwa-diagnostics";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export interface PushSubscriptionState {
  isSupported: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission | "unsupported";
  isBusy: boolean;
  subscribe: () => Promise<{ success: boolean; error?: string }>;
  unsubscribe: () => Promise<{ success: boolean; error?: string }>;
}

/**
 * The one place that knows how to turn this device's notification
 * permission into a saved subscription — shared by the full diagnostics
 * panel on `/pwa-test` and the plain toggle on Settings, so "subscribed" can
 * never mean something different depending on which screen asked.
 */
export function usePushSubscription(): PushSubscriptionState {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(true);
    setPermission(getNotificationPermission());

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(setSubscription)
      .catch(() => setSubscription(null));
  }, []);

  async function subscribe() {
    if (permission === "denied") {
      return {
        success: false,
        error:
          "Notifications are blocked — re-enable them from your browser's site settings, then reload.",
      };
    }

    setIsBusy(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      const result = await subscribeUser(JSON.parse(JSON.stringify(sub)));

      if (!result.success) {
        await sub.unsubscribe().catch(() => {});
        return { success: false, error: result.error ?? "Could not save the subscription." };
      }

      setSubscription(sub);
      return { success: true };
    } catch (cause) {
      return {
        success: false,
        error: cause instanceof Error ? cause.message : "Please try again.",
      };
    } finally {
      setPermission(getNotificationPermission());
      setIsBusy(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return { success: true };

    setIsBusy(true);

    try {
      const result = await unsubscribeUser(subscription.endpoint);

      if (!result.success) {
        return { success: false, error: result.error ?? "Could not clear the subscription." };
      }

      await subscription.unsubscribe();
      setSubscription(null);
      return { success: true };
    } catch (cause) {
      return {
        success: false,
        error: cause instanceof Error ? cause.message : "Please try again.",
      };
    } finally {
      setIsBusy(false);
    }
  }

  return { isSupported, subscription, permission, isBusy, subscribe, unsubscribe };
}
