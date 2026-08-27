"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getNotificationPermission } from "@/components/pwa/pwa-diagnostics";
import {
  subscribeUser,
  unsubscribeUser,
  sendNotification,
} from "@/app/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushNotificationManager() {
  const { toast } = useToast();

  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [message, setMessage] = useState("");
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

  async function subscribeToPush() {
    if (permission === "denied") {
      toast({
        tone: "error",
        title: "Notifications are blocked",
        description:
          "Re-enable them from your browser's site settings, then reload this page.",
      });
      return;
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
        throw new Error(result.error ?? "Could not save the subscription.");
      }

      setSubscription(sub);
      toast({ tone: "success", title: "Subscribed to push notifications" });
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not subscribe",
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setPermission(getNotificationPermission());
      setIsBusy(false);
    }
  }

  async function unsubscribeFromPush() {
    if (!subscription) return;

    setIsBusy(true);

    try {
      const result = await unsubscribeUser();

      if (!result.success) {
        throw new Error(result.error ?? "Could not clear the subscription.");
      }

      await subscription.unsubscribe();
      setSubscription(null);

      toast({ tone: "success", title: "Unsubscribed from push notifications" });
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not unsubscribe",
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function sendTestNotification() {
    if (!message.trim()) return;

    setIsBusy(true);

    try {
      const result = await sendNotification(message);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to send notification");
      }

      setMessage("");
      toast({ tone: "success", title: "Test notification sent" });
    } catch (cause) {
      toast({
        tone: "error",
        title: "Could not send notification",
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications are not supported in this browser.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">
          Push Notifications
        </h3>
      </div>

      {subscription ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Permission</span>
              <span className="font-medium text-success">Granted</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subscription</span>
              <span className="font-medium text-success">Active</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={unsubscribeFromPush}
          >
            <BellOff className="size-4" aria-hidden="true" />
            Disable Notifications
          </Button>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pwa-test-message">Test notification</Label>
            <div className="flex gap-2">
              <Input
                id="pwa-test-message"
                placeholder="message…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <Button
                type="button"
                disabled={isBusy || !message.trim()}
                onClick={sendTestNotification}
              >
                {isBusy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      ) : permission === "denied" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Permission</span>
            <span className="font-medium text-danger">Denied</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Notifications are blocked for this site. Re-enable them from your
            browser&apos;s site settings (usually via the icon left of the
            address bar), then reload this page — the browser won&apos;t show
            the permission prompt again on its own.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            You are not subscribed to push notifications.
          </p>

          <Button type="button" disabled={isBusy} onClick={subscribeToPush}>
            {isBusy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Bell className="size-4" aria-hidden="true" />
            )}
            Subscribe
          </Button>
        </div>
      )}
    </div>
  );
}
