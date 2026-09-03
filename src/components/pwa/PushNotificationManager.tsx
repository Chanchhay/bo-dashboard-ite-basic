"use client";

import { useState } from "react";
import { Bell, BellOff, LoaderCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { sendTestNotification } from "@/app/actions";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushNotificationManager() {
  const { toast } = useToast();
  const { isSupported, subscription, permission, isBusy, subscribe, unsubscribe } =
    usePushSubscription();
  const [message, setMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  async function handleSubscribe() {
    const result = await subscribe();

    if (!result.success) {
      toast({
        tone: "error",
        title: "Could not subscribe",
        description: result.error,
      });
      return;
    }

    toast({ tone: "success", title: "Subscribed to push notifications" });
  }

  async function handleUnsubscribe() {
    const result = await unsubscribe();

    if (!result.success) {
      toast({
        tone: "error",
        title: "Could not unsubscribe",
        description: result.error,
      });
      return;
    }

    toast({ tone: "success", title: "Unsubscribed from push notifications" });
  }

  async function handleSendTest() {
    if (!message.trim()) return;

    setIsSendingTest(true);

    try {
      const result = await sendTestNotification(message);

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
      setIsSendingTest(false);
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
            onClick={handleUnsubscribe}
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
                disabled={isSendingTest || !message.trim()}
                onClick={handleSendTest}
              >
                {isSendingTest ? (
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

          <Button type="button" disabled={isBusy} onClick={handleSubscribe}>
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
