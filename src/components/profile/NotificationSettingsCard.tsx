"use client";

import { Bell, BellOff, BellRing, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { usePushSubscription } from "@/hooks/usePushSubscription";

/**
 * Settings' plain answer to "will my phone tell me when a sale happens".
 *
 * Deliberately without the raw test-message box `PushNotificationManager`
 * shows on `/pwa-test` — that one is a diagnostics panel for whoever is
 * debugging the feature, not something a cashier should be offered.
 */
export function NotificationSettingsCard() {
  const { toast } = useToast();
  const { isSupported, subscription, permission, isBusy, subscribe, unsubscribe } =
    usePushSubscription();

  async function handleToggle() {
    const result = subscription ? await unsubscribe() : await subscribe();

    if (!result.success) {
      toast({
        tone: "error",
        title: subscription ? "Could not turn off notifications" : "Could not turn on notifications",
        description: result.error,
      });
      return;
    }

    toast({
      tone: "success",
      title: subscription ? "Notifications turned off" : "Notifications turned on",
      description: subscription
        ? undefined
        : "You'll be notified here when a sale, low-stock alert, or new order comes in.",
    });
  }

  return (
    <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {subscription ? (
            <BellRing className="size-4" aria-hidden="true" />
          ) : (
            <Bell className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#161d16] dark:text-[#f8fafc]">
            Notifications on this device
          </h2>
          <p className="mt-1 text-sm text-[#6b7569] dark:text-[#94a3b8]">
            {!isSupported
              ? "This browser doesn't support push notifications."
              : permission === "denied"
                ? "Blocked — re-enable them from your browser's site settings, then reload this page."
                : subscription
                  ? "You'll get an alert here for every sale, low-stock warning, and new order."
                  : "Turn this on to get a notification here for sales, low-stock alerts, and new orders — even with the app closed."}
          </p>
        </div>
      </div>

      {isSupported && permission !== "denied" && (
        <Button
          type="button"
          variant={subscription ? "outline" : "default"}
          disabled={isBusy}
          onClick={handleToggle}
          className="mt-4 w-full sm:w-auto"
        >
          {isBusy ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : subscription ? (
            <BellOff className="size-4" aria-hidden="true" />
          ) : (
            <Bell className="size-4" aria-hidden="true" />
          )}
          {subscription ? "Turn off notifications" : "Turn on notifications"}
        </Button>
      )}
    </section>
  );
}
