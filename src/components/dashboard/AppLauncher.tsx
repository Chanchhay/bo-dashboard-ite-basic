"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationMenu } from "../notification/Notification";
import {
    launcherApps,
    sectionEntryHref,
    type NavSection,
} from "@/components/layout/navigation";
import UserMenu from "@/components/layout/UserMenu";
import type { Permission } from "@/lib/permissions";
import BrandLogo from "@/components/brand/BrandLogo";

import { Compass } from "lucide-react";
import ThemeToggle from "@/components/dark-mode/theme-toggle";
import { startGuidedTour } from "@/components/onboarding/GuidedTour";

/** How long the icon grows before the route actually changes. */
const OPEN_MS = 620;

type Opening = {
    section: NavSection;
    cx: number;
    cy: number;
    size: number;
};

export default function AppLauncher({
    managerName,
    permissions,
}: {
    managerName: string;
    permissions: Permission[];
}) {
    const router = useRouter();
    const [opening, setOpening] = useState<Opening | null>(null);

    const apps = launcherApps(permissions);

    useEffect(() => {
        if (!opening) return;
        const go = setTimeout(
            () => router.push(sectionEntryHref(opening.section)),
            OPEN_MS - 80,
        );
        return () => clearTimeout(go);
    }, [opening, router]);

    return (
        <div className="min-h-dvh flex flex-col bg-[#f5f5f5] dark:bg-[#0f1219]">
            <header className="flex h-16 sm:h-[88px] items-center justify-between border-0 px-4 sm:px-5 lg:px-8 bg-white dark:bg-[#1a1e29]">
                <Link
                    href="/apps"
                    aria-label="FluxiBiz home"
                    className="flex h-7 sm:h-9 w-auto min-w-max items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#006b26] focus-visible:ring-offset-2"
                >
                    <BrandLogo variant="wordmark" alt="" preload className="h-6 sm:h-8 w-auto shrink-0" />
                </Link>

                <div className="flex items-center gap-3 sm:gap-5">
                    <button
                        type="button"
                        onClick={startGuidedTour}
                        title="Take Guided Tour"
                        aria-label="Take Guided Tour"
                        className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#e2e2de] dark:border-[#242937] bg-white dark:bg-[#1e2330] px-3 py-1.5 text-xs font-semibold text-primary hover:bg-[#f7f7f6] dark:hover:bg-[#252a38] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <Compass className="size-4" />
                        <span>Guided Tour</span>
                    </button>

                    <ThemeToggle variant="icon" className="hidden sm:grid" />
                    <div data-tour="notifications" className="inline-flex">
                        <NotificationMenu />
                    </div>
                    <div data-tour="user-menu" className="inline-flex">
                        <UserMenu name={managerName} />
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1180px] px-5 py-8 lg:px-8 lg:py-12">
                <header className="mb-8 sm:mb-10" data-tour="apps-welcome">
                    <h1 className="text-[32px] leading-tight text-[#161d16] dark:text-[#f8fafc]">
                        <span className="font-semibold">Hello,</span>{" "}
                        {managerName.split(" ")[0]}
                    </h1>
                    <p className="mt-1.5 text-[16px] text-[#3d4a3c] dark:text-[#94a3b8]">
                        Choose an app to open.
                    </p>
                </header>

                {apps.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4" data-tour="apps-grid">
                        {apps.map((section) => (
                            <li key={section.id} data-tour={`app-tile-${section.id}`}>
                                <AppTile
                                    section={section}
                                    onOpen={setOpening}
                                    busy={opening !== null}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="rounded-[24px] bg-white dark:bg-[#1a1e29] border-0 px-6 py-10 text-center text-[15px] text-[#3d4a3c] dark:text-[#94a3b8]">
                        No apps are available for your role yet. Ask an
                        administrator to review your permissions.
                    </p>
                )}
            </main>

            {opening && <AppOpen {...opening} />}
        </div>
    );
}

function AppTile({
    section,
    onOpen,
    busy,
}: {
    section: NavSection;
    onOpen: (opening: Opening) => void;
    busy: boolean;
}) {
    const badgeRef = useRef<HTMLSpanElement>(null);
    const Icon = section.icon;
    const app = section.app!;

    return (
        <Link
            href={sectionEntryHref(section)}
            onClick={(event) => {
                const badge = badgeRef.current?.getBoundingClientRect();
                const reduced = window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                ).matches;
                if (reduced || busy || !badge) return;

                event.preventDefault();
                onOpen({
                    section,
                    cx: badge.left + badge.width / 2,
                    cy: badge.top + badge.height / 2,
                    size: badge.width,
                });
            }}
            className="group flex h-full select-none flex-col items-center gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-5 rounded-[20px] sm:rounded-[26px] md:rounded-[30px] border-0 bg-transparent px-2 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-7 lg:pt-8 pb-4 sm:pb-6 md:pb-7 lg:pb-8 text-center outline-none transition-transform duration-200 ease-out hover:scale-[1.05] focus-visible:ring-2 focus-visible:ring-[#006b26] focus-visible:ring-offset-2"
        >
            <span
                ref={badgeRef}
                aria-hidden="true"
                className="grid size-16 sm:size-18 md:size-20 lg:size-24 place-items-center rounded-[18px] sm:rounded-[22px] md:rounded-[24px] lg:rounded-[26px] transition-transform duration-200 ease-out group-hover:scale-110 shrink-0"
                style={{ background: app.fill, color: app.ink }}
            >
                <Icon className="size-7 sm:size-8 md:size-9 lg:size-11" strokeWidth={1.8} />
            </span>
            <span className="text-sm sm:text-base md:text-lg lg:text-[21px] font-normal leading-tight sm:leading-[24px] md:leading-[28px] lg:leading-[30px] text-[#161d16] dark:text-[#f8fafc]">
                {app.label.split(" ").map((word) => (
                    <span key={word} className="block">
                        {word}
                    </span>
                ))}
            </span>
        </Link>
    );
}

/*
 * A pure `transform: scale()` on a circle seeded at the icon's own position.
 * Growing the real rectangle instead would mean animating width/height, which
 * relayouts every frame; scaling a fixed-size layer stays on the compositor.
 */
function AppOpen({ section, cx, cy, size }: Opening) {
    const [grown, setGrown] = useState(false);
    const Icon = section.icon;
    const app = section.app!;

    useEffect(() => {
        const raf = requestAnimationFrame(() => setGrown(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    // Reach the furthest corner from wherever the icon happens to sit.
    const reach = Math.hypot(
        Math.max(cx, window.innerWidth - cx),
        Math.max(cy, window.innerHeight - cy),
    );
    const scale = ((reach * 2) / size) * 1.05;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
            <div
                className="absolute rounded-full"
                style={{
                    left: cx - size / 2,
                    top: cy - size / 2,
                    width: size,
                    height: size,
                    background: app.fill,
                    transform: `scale(${grown ? scale : 1})`,
                    transition: `transform ${OPEN_MS}ms cubic-bezier(.5,0,.2,1)`,
                    willChange: "transform",
                }}
            />
            <div
                className="absolute grid place-items-center"
                style={{
                    left: cx - size / 2,
                    top: cy - size / 2,
                    width: size,
                    height: size,
                    color: app.ink,
                    opacity: grown ? 0 : 1,
                    transform: `scale(${grown ? 1.6 : 1})`,
                    transition: `transform ${OPEN_MS}ms cubic-bezier(.5,0,.2,1), opacity ${OPEN_MS * 0.7}ms linear`,
                    willChange: "transform, opacity",
                }}
            >
                <Icon className="size-11" strokeWidth={1.8} />
            </div>
        </div>
    );
}


