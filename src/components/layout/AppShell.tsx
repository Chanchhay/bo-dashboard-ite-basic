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

    // The launcher owns the whole viewport — no sidebar, no top bar. Every
    // other route gets the shell, scoped to whichever app it belongs to.
    const chromeless = pathname === "/apps";

    // Following a link inside the mobile drawer should close it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setNavOpen(false), [pathname]);

    /*
     * Start a new page at the top of it.
     *
     * Next resets the window's scroll on navigation, but the window is not
     * what scrolls here — the shell is pinned to the viewport and `main` is
     * the scroll container, so it keeps whatever offset the last page left
     * behind. Switching from a long list to another one landed halfway down
     * the new page with its heading and tabs above the fold, which reads as
     * the page having lost its header.
     *
     * Keyed on the path alone: a query change is the same page filtering or
     * paginating itself, and yanking the reader to the top there would be its
     * own bug.
     */
    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

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
        return (
            <div className="min-h-dvh bg-white dark:bg-[#0f1219] text-foreground">
                <GuidedTour />
                {children}
            </div>
        );
    }

    return (
        /*
         * The shell is taken out of flow so the document itself can never
         * scroll: a page is exactly the viewport, and the only thing that
         * moves is the main region below. Nothing here creates a containing
         * block for `fixed`, so the mobile drawer still anchors to the
         * viewport.
         */
        <div className="fixed inset-0 overflow-hidden bg-[#e8e8e6] dark:bg-[#0f1219] lg:p-4 text-foreground">
            <GuidedTour />
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
            {/*
             * The panel owns the viewport height and only the main region
             * scrolls, so the sidebar and the top bar stay put while a long
             * page moves underneath them.
             */}
            <div className="flex h-full gap-0 overflow-hidden bg-shell lg:rounded-[28px] border border-transparent lg:dark:border-white/6 shadow-2xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]">
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
                        className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 lg:px-8"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
