"use client";

import { useCallback } from "react";

import { notifyUsersPush } from "@/app/actions";
import { useCreateNotificationMutation } from "@/services/notificationApi";

export interface NotifyInput {
  senderId: string;
  senderName?: string;
  receiverIds: string[];
  type: "ORDER" | "PAYMENT" | "INVENTORY" | "SYSTEM" | "PROMOTION";
  title: string;
  content?: string;
  deepLink?: string;
}

/**
 * Every place in this app that rings the in-app bell for a business event —
 * a sale, a low-stock line, a parked order — wants the same event to also
 * land on whichever phones the recipients installed this app on. Same
 * signature as `useCreateNotificationMutation`'s trigger, so a call site
 * swaps to this by changing one name.
 *
 * The two writes are independent on purpose: the bell is this dashboard's own
 * `createNotification` mutation (unread counts, the inbox list), the phone is
 * a Web Push send. Either can fail without taking the other down — a device
 * with a stale registration should not cost the sale its inbox entry, and a
 * slow push send should not hold up the checkout flow waiting on it.
 */
export function useNotifyWithPush() {
  const [createNotification] = useCreateNotificationMutation();

  return useCallback(
    (input: NotifyInput) => {
      const inbox = createNotification(input).unwrap();

      void notifyUsersPush(input.receiverIds, {
        title: input.title,
        body: input.content ?? input.title,
        url: input.deepLink,
      }).catch(() => {});

      return inbox;
    },
    [createNotification],
  );
}
