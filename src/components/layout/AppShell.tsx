"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import type { Permission } from "@/lib/permissions";

export default function AppShell({
    managerName,
    permissions,
    children,
}: {
    managerName: string;
    permissions: Permission[];
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);

    // The launcher owns the whole viewport — no sidebar, no top bar. Every
    // other route gets the shell, scoped to whichever app it belongs to.
    const chromeless = pathname === "/apps";

    // Following a link inside the mobile drawer should close it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setNavOpen(false), [pathname]);

    // The drawer is a modal surface on small screens: Escape dismisses it and
    // the page behind must not scroll underneath.
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
        return <div className="min-h-dvh bg-white dark:bg-[#0f1219] text-foreground">{children}</div>;
    }

    return (
        <div className="min-h-dvh bg-[#e8e8e6] dark:bg-[#0f1219] lg:p-4 text-foreground">
            <a
                href="#main-content"
                className="sr-only rounded-lg bg-white dark:bg-[#1e2330] px-4 py-2 text-[14px] text-[#16181c] dark:text-[#f8fafc] focus:not-sr-only focus:absolute focus:top-6 focus:left-6 focus:z-50"
            >
                Skip to content
            </a>

            {/*
             * The border is deliberately a low-alpha white rather than a solid
             * grey: at #242937 it was lighter than both the page behind it and
             * the panel itself, so it read as a drawn outline instead of an
             * edge. It also only applies from `lg`, where the panel is inset
             * and rounded — below that the panel is full-bleed and the border
             * was landing as a hairline against the viewport edge.
             */}
            <div className="flex min-h-dvh gap-0 bg-shell lg:min-h-[calc(100dvh-2rem)] lg:rounded-[28px] border border-transparent lg:dark:border-white/6 shadow-2xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">
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
                        className="flex-1 px-5 pb-8 lg:px-8"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
