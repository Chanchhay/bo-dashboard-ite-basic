"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, SatelliteDish } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  checkManifest,
  checkServiceWorker,
  detectBrowser,
  detectPlatform,
  getNotificationPermission,
  getPushSubscribed,
  isSecureContext,
  isStandaloneDisplay,
  type Browser,
  type CheckStatus,
  type Platform,
} from "@/components/pwa/pwa-diagnostics";

type Tone = "success" | "warning" | "danger" | "neutral";

type Status = {
  platform: Platform;
  browser: Browser;
  isStandalone: boolean;
  isHttps: boolean;
  manifest: CheckStatus;
  serviceWorker: CheckStatus;
  serviceWorkerScope: string | null;
  notificationPermission: NotificationPermission | "unsupported";
  pushSubscribed: boolean;
  isOnline: boolean;
};

const toneDot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-[#9aa1ac] dark:bg-[#5c6675]",
};

const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted-foreground",
};

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-sm font-medium", toneText[tone])}>
        <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />
        {value}
      </span>
    </div>
  );
}

function checkTone(status: CheckStatus): Tone {
  if (status === "ready") return "success";
  if (status === "problem") return "danger";
  return "neutral";
}

export function PwaStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    const [manifest, serviceWorker, pushSubscribed] = await Promise.all([
      checkManifest(),
      checkServiceWorker(),
      getPushSubscribed(),
    ]);

    setStatus({
      platform: detectPlatform(navigator.userAgent),
      browser: detectBrowser(navigator.userAgent),
      isStandalone: isStandaloneDisplay(),
      isHttps: isSecureContext(),
      manifest: manifest.status,
      serviceWorker: serviceWorker.status,
      serviceWorkerScope: serviceWorker.scope,
      notificationPermission: getNotificationPermission(),
      pushSubscribed,
      isOnline: navigator.onLine,
    });

    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const onFocusLike = () => refresh();

    window.addEventListener("online", onFocusLike);
    window.addEventListener("offline", onFocusLike);
    window.addEventListener("appinstalled", onFocusLike);
    window.addEventListener("focus", onFocusLike);
    document.addEventListener("visibilitychange", onFocusLike);

    return () => {
      window.removeEventListener("online", onFocusLike);
      window.removeEventListener("offline", onFocusLike);
      window.removeEventListener("appinstalled", onFocusLike);
      window.removeEventListener("focus", onFocusLike);
      document.removeEventListener("visibilitychange", onFocusLike);
    };
  }, [refresh]);

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SatelliteDish className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">PWA Status</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isRefreshing}
          onClick={refresh}
          aria-label="Refresh PWA status"
        >
          <RefreshCw
            className={cn("size-3.5", isRefreshing && "animate-spin")}
            aria-hidden="true"
          />
        </Button>
      </div>

      {!status ? (
        <p className="py-2 text-sm text-muted-foreground">Checking…</p>
      ) : (
        <div className="divide-y divide-border/60">
          <StatusRow label="Platform" value={status.platform} tone="neutral" />
          <StatusRow label="Browser" value={status.browser} tone="neutral" />
          <StatusRow
            label="Display mode"
            value={status.isStandalone ? "Standalone" : "Browser"}
            tone={status.isStandalone ? "success" : "neutral"}
          />
          <StatusRow
            label="Install status"
            value={status.isStandalone ? "Installed" : "Not installed"}
            tone={status.isStandalone ? "success" : "neutral"}
          />
          <StatusRow
            label="HTTPS / secure context"
            value={status.isHttps ? "Yes" : "No"}
            tone={status.isHttps ? "success" : "danger"}
          />
          <StatusRow
            label="Manifest"
            value={status.manifest === "checking" ? "Checking…" : status.manifest === "ready" ? "Ready" : "Problem"}
            tone={checkTone(status.manifest)}
          />
          <StatusRow
            label="Service Worker"
            value={status.serviceWorker === "checking" ? "Checking…" : status.serviceWorker === "ready" ? "Ready" : "Problem"}
            tone={checkTone(status.serviceWorker)}
          />
          <StatusRow
            label="Service Worker scope"
            value={status.serviceWorkerScope ?? "—"}
            tone={status.serviceWorkerScope ? "success" : "neutral"}
          />
          <StatusRow
            label="Notification permission"
            value={
              status.notificationPermission === "unsupported"
                ? "Unsupported"
                : status.notificationPermission === "granted"
                  ? "Granted"
                  : status.notificationPermission === "denied"
                    ? "Denied"
                    : "Default"
            }
            tone={
              status.notificationPermission === "granted"
                ? "success"
                : status.notificationPermission === "denied"
                  ? "danger"
                  : "neutral"
            }
          />
          <StatusRow
            label="Push subscription"
            value={status.pushSubscribed ? "Subscribed" : "Not subscribed"}
            tone={status.pushSubscribed ? "success" : "neutral"}
          />
          <StatusRow
            label="Network"
            value={status.isOnline ? "Online" : "Offline"}
            tone={status.isOnline ? "success" : "warning"}
          />
        </div>
      )}
    </div>
  );
}
