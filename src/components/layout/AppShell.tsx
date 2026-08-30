"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import GuidedTour from "@/components/onboarding/GuidedTour";
import type { GrantedPermissions } from "@/lib/permissions";

export default function AppShell({
    managerName,
    permissions,
    children,
}: {
    managerName: string;
    permissions: GrantedPermissions;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);

    const chromeless = pathname === "/apps";

    
    // eslint-disable-next-line react-hooks/set-state-in-effect 
    useEffect(() => setNavOpen(false), [pathname]);

    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    useEffect(() => {
        if (!navOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setNavOpen(false);
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [navOpen]);

    if (chromeless) {
        return (
            <div className="min-h-dvh bg-white dark:bg-[#0f1219] text-foreground">
                <GuidedTour />
                {children}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 overflow-clip bg-[#e8e8e6] dark:bg-[#0f1219] lg:p-4 text-foreground">
            <GuidedTour />
            <a
                href="#main-content"
                className="sr-only rounded-lg bg-white dark:bg-[#1e2330] px-4 py-2 text-[14px] text-[#16181c] dark:text-[#f8fafc] focus:not-sr-only focus:absolute focus:top-6 focus:left-6 focus:z-50"
            >
                Skip to content
            </a>

            <div className="flex h-full gap-0 overflow-clip bg-shell lg:rounded-[28px] border border-transparent lg:dark:border-white/6 shadow-2xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">
                <Sidebar
                    open={navOpen}
                    onClose={() => setNavOpen(false)}
                    permissions={permissions}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <Header
                        managerName={managerName}
                        onOpenNav={() => setNavOpen(true)}
                    />

                    <main
                        id="main-content"
                        ref={mainRef}
                        className="min-h-0 flex-1 overflow-y-auto scroll-pt-28 scroll-pb-28 px-5 pb-8 lg:px-8"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
