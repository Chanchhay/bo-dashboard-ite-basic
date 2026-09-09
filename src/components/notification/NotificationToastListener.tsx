"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { notificationSocket } from "@/lib/notification-socket";
import { playNotificationSound } from "@/lib/notification-helper";
import { authClient } from "@/lib/auth/auth-client";
import type { Notification } from "@/lib/api/notification";

export function NotificationToastListener() {
    const { toast } = useToast();
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const userId = session?.user?.id;
    const handledIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!userId) {
            notificationSocket.disconnect();
            return;
        }

        notificationSocket.connect({
            receiverId: userId,
            userId: userId,
        });

        const unsubscribe = notificationSocket.subscribe((notification: Notification) => {
            if (!notification || !notification.id) return;

            if (handledIdsRef.current.has(notification.id)) {
                return;
            }
            handledIdsRef.current.add(notification.id);

            if (handledIdsRef.current.size > 200) {
                const first = handledIdsRef.current.values().next().value;
                if (first) handledIdsRef.current.delete(first);
            }

            playNotificationSound(notification.type ?? undefined);

            const type = (notification.type || "").toUpperCase();
            let tone: "success" | "error" | "info" = "info";
            if (type === "ORDER" || type === "PAYMENT" || type === "SUCCESS") {
                tone = "success";
            } else if (type === "INVENTORY" || type === "LOW_STOCK" || type === "WARNING" || type === "ALERT" || type === "ERROR" || type === "DANGER") {
                tone = "error";
            }

            const link = notification.deepLink;
            toast({
                tone,
                title: notification.title || "New Notification",
                description: notification.content || undefined,
                onClick: link && link !== "#" ? () => router.push(link) : undefined,
            });
        });

        return () => {
            unsubscribe();
        };
    }, [userId, toast, router]);

    return null;
}
