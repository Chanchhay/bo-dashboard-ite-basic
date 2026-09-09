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
