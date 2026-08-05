"use client";

import { useState } from "react";
import { Provider } from "react-redux";

import { ToastProvider } from "@/components/ui/toast";
import { NotificationToastListener } from "@/components/notification/NotificationToastListener";
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
                {children}
            </ToastProvider>
        </Provider>
    );
}
