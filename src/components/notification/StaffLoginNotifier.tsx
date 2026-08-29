"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { useNotifyStaffLoginMutation } from "@/services/userProfileApi";

const STORAGE_KEY = "ipos_staff_login_notified_user";

export function StaffLoginNotifier() {
    const { data: session } = authClient.useSession();
    const [notifyStaffLogin] = useNotifyStaffLoginMutation();
    const notifiedRef = useRef<string | null>(null);

    const userId = session?.user?.id;

    useEffect(() => {
        if (!userId) return;

        // Prevent firing twice in the same React mount cycle
        if (notifiedRef.current === userId) return;

        // Check if already notified for this user in the current browser session
        if (typeof window !== "undefined") {
            try {
                const storedUserId = window.sessionStorage.getItem(STORAGE_KEY);
                if (storedUserId === userId) {
                    notifiedRef.current = userId;
                    return;
                }
            } catch {
                // Ignore storage errors
            }
        }

        notifiedRef.current = userId;
        if (typeof window !== "undefined") {
            try {
                window.sessionStorage.setItem(STORAGE_KEY, userId);
            } catch {
                // Ignore storage errors
            }
        }

        // Fire login notification to backend (if staff member, BO receives alert)
        notifyStaffLogin()
            .unwrap()
            .catch(() => {
                // Ignore network errors silently so it never affects user UX
            });
    }, [userId, notifyStaffLogin]);

    return null;
}
