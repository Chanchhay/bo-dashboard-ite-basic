"use client";

import { useState } from "react";
import { Provider } from "react-redux";

import { ToastProvider } from "@/components/ui/toast";
import { NotificationToastListener } from "@/components/notification/NotificationToastListener";
import { StaffLoginNotifier } from "@/components/notification/StaffLoginNotifier";
import { makeStore, type AppStore } from "@/store/store";

export default function StoreProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [store] = useState<AppStore>(() => makeStore());

    return (
        <Provider store={store}>
            <ToastProvider>
                <NotificationToastListener />
                <StaffLoginNotifier />
                {children}
            </ToastProvider>
        </Provider>
    );
}
