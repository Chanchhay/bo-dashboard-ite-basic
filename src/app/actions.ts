"use server";

import { headers } from "next/headers";
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { auth } from "@/lib/auth/auth";

webpush.setVapidDetails(
  "mailto:ipos.istad@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

let subscription: WebPushSubscription | null = null;

async function hasSession() {
  const session = await auth.api.getSession({ headers: await headers() });

  return Boolean(session);
}

export async function subscribeUser(sub: WebPushSubscription) {
  if (!(await hasSession())) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  subscription = sub;

  return { success: true };
}

export async function unsubscribeUser() {
  if (!(await hasSession())) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  subscription = null;

  return { success: true };
}

export async function sendNotification(message: string) {
  if (!(await hasSession())) {
    return { success: false, error: "Your session has expired. Please sign in again." };
  }

  if (!subscription) {
    return {
      success: false,
      error:
        "No subscription on the server. This dev store resets on every restart — unsubscribe and subscribe again.",
    };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "FluxiBiz",
        body: message,
        icon: "/pwa/icon-192x192.png",
        url: "/",
      }),
    );

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
