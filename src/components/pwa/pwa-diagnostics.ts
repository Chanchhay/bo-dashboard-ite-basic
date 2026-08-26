export type CheckStatus = "checking" | "ready" | "problem";

export type Platform = "Desktop" | "Android" | "iOS";
export type Browser = "Chrome" | "Edge" | "Safari" | "Other";

export function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPod/.test(userAgent)) return "iOS";
  if (/iPad/.test(userAgent)) return "iOS";
  if (
    /Macintosh/.test(userAgent) &&
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 1
  ) {
    return "iOS";
  }
  if (/Android/.test(userAgent)) return "Android";
  return "Desktop";
}

export function detectBrowser(userAgent: string): Browser {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/CriOS|Chrome\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Other";
}

export function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

export async function checkManifest(): Promise<{
  status: CheckStatus;
  detail?: string;
}> {
  try {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const href = link?.href ?? "/manifest.webmanifest";
    const response = await fetch(href, { cache: "no-store" });

    if (!response.ok) {
      return { status: "problem", detail: `HTTP ${response.status}` };
    }

    const manifest = (await response.json()) as {
      name?: string;
      start_url?: string;
      display?: string;
      icons?: unknown[];
    };

    const hasIcons = Array.isArray(manifest.icons) && manifest.icons.length > 0;
    const installableDisplay =
      manifest.display === "standalone" ||
      manifest.display === "fullscreen" ||
      manifest.display === "minimal-ui";

    if (!manifest.name || !manifest.start_url || !hasIcons || !installableDisplay) {
      return { status: "problem", detail: "Missing required fields" };
    }

    return { status: "ready" };
  } catch {
    return { status: "problem", detail: "Could not load the manifest" };
  }
}

export async function checkServiceWorker(): Promise<{
  status: CheckStatus;
  scope: string | null;
}> {
  if (!("serviceWorker" in navigator)) {
    return { status: "problem", scope: null };
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration("/");

    if (existing?.active) {
      return { status: "ready", scope: existing.scope };
    }

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);

    return registration
      ? { status: "ready", scope: registration.scope }
      : { status: "problem", scope: null };
  } catch {
    return { status: "problem", scope: null };
  }
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function getPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}
