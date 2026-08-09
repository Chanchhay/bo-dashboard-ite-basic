"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    isLeafActive,
    isNavGroup,
    isSectionActive,
    visibleSections,
    type NavLaunch,
    type NavSection,
} from "@/components/layout/navigation";
import type { Permission } from "@/lib/permissions";
import BrandLogo from "@/components/brand/BrandLogo";

export default function Sidebar({
    open,
    onClose,
    permissions,
}: {
    open: boolean;
    onClose: () => void;
    permissions: Permission[];
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const fullPath = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

    const allowed = visibleSections(permissions);
    // The shell belongs to the app you opened, so the sidebar shows that app's
    // own pages and nothing else. Routes that sit outside any app (your
    // profile, for instance) get just the way back.
    //
    // Resolved against `allowed` rather than the raw navigation, so a page the
    // user can't reach never appears in the scoped list either.
    const current = allowed.find((section) =>
        isSectionActive(section, pathname),
    );
    const sections = current ? [current] : [];

    return (
        <>
            {/* Scrim only exists for the mobile drawer. */}
            <div
                onClick={onClose}
                aria-hidden="true"
                className={cn(
                    "fixed inset-0 z-30 bg-[#16181c]/30 transition-opacity duration-200 lg:hidden",
                    open
                        ? "opacity-100"
                        : "pointer-events-none opacity-0",
                )}
            />

            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-shell",
                    /* `visibility` keeps the closed drawer out of the tab order
                       instead of leaving focusable links parked off-screen. It
                       transitions discretely, so the slide-out still plays. */
                    "transition-[transform,visibility] duration-200 ease-out",
                    "lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-[calc(100dvh-2rem)] lg:translate-x-0 lg:bg-transparent",
                    open ? "translate-x-0" : "invisible -translate-x-full",
                )}
            >
                <div className="flex items-center justify-between px-6 pt-6 pb-8">
                    <Link
                        href="/apps"
                        onClick={onClose}
                        aria-label="FluxiBiz home"
                        className="flex h-7 sm:h-9 w-auto min-w-max items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        <BrandLogo variant="wordmark" alt="" preload className="h-6 sm:h-8 w-auto shrink-0" />
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="grid size-11 place-items-center rounded-full text-[#5c6660] dark:text-[#94a3b8] outline-none hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <nav
                    aria-label={current?.app?.label ?? current?.label ?? "App"}
                    className="flex-1 overflow-y-auto px-4 pb-6"
                >
                    <Link
                        href="/apps"
                        onClick={onClose}
                        className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] text-[#5c6660] dark:text-[#94a3b8] outline-none transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06] hover:text-[#16181c] dark:hover:text-[#f8fafc] focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        All apps
                    </Link>

                    <ul className="flex flex-col gap-1">
                        {sections.map((section) => (
                            <li key={section.id}>
                                <SectionItem
                                    section={section}
                                    pathname={pathname}
                                    fullPath={fullPath}
                                    onNavigate={onClose}
                                />
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Pinned rather than scrolled with the nav: leaving for another
                    app is always available, and never mistaken for a page. */}
                {current?.launch && (
                    <LaunchButton launch={current.launch} onNavigate={onClose} />
                )}
            </div>
        </>
    );
}

function LaunchButton({
    launch,
    onNavigate,
}: {
    launch: NavLaunch;
    onNavigate: () => void;
}) {
    const Icon = launch.icon;

    return (
        <div className="border-t border-[#e2e2de] dark:border-[#242937] px-4 pt-4 pb-6">
            <Link
                href={launch.href}
                onClick={onNavigate}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-[14px] font-semibold text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shadow-lg shadow-primary/20"
            >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {launch.label}
            </Link>
        </div>
    );
}

function SectionItem({
    section,
    pathname,
    fullPath,
    onNavigate,
}: {
    section: NavSection;
    pathname: string;
    fullPath: string;
    onNavigate: () => void;
}) {
    const active = isSectionActive(section, pathname);
    const Icon = section.icon;

    const rowClass =
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";

    if (!section.children) {
        return (
            <Link
                href={section.href ?? "#"}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                    rowClass,
                    active
                        ? "bg-white dark:bg-[#1e2330] text-[#16181c] dark:text-[#f8fafc] shadow-[0_1px_2px_rgba(22,24,28,.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-transparent dark:border-[#2a3042]"
                        : "text-[#5c6660] dark:text-[#94a3b8] hover:bg-black/[.04] dark:hover:bg-white/[.05] hover:text-[#16181c] dark:hover:text-[#f8fafc]",
                )}
            >
                <Icon
                    className={cn(
                        "size-[18px] shrink-0",
                        active ? "text-primary" : "dark:text-[#94a3b8]",
                    )}
                    aria-hidden="true"
                />
                {section.app?.label ?? section.label}
            </Link>
        );
    }

    return (
        <>
            {/* Not a control — inside an app there is nothing to collapse into.
                Named as the launcher names it, so the tile you clicked and the
                app you land in agree. */}
            <p className={cn(rowClass, "font-medium text-[#16181c] dark:text-[#f8fafc]")}>
                <Icon
                    className="size-[18px] shrink-0 text-primary"
                    aria-hidden="true"
                />
                {section.app?.label ?? section.label}
            </p>

            <ul
                /* The rail is the only thing tying children to their parent,
                   so it sits on the list rather than each row. */
                className="mt-1 ml-[26px] flex flex-col gap-1 border-l border-[#dcdcd8] dark:border-[#242937] pl-3"
            >
                {section.children.map((leaf) => {
                    const leafActive = isLeafActive(leaf, fullPath);

                    if (isNavGroup(leaf)) {
                        return (
                            <li key={leaf.label}>
                                <details
                                    className="group/pos"
                                    open={leafActive || undefined}
                                >
                                    <summary
                                        className={cn(
                                            "flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium outline-none transition-colors marker:hidden focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden",
                                            leafActive
                                                ? "bg-white dark:bg-[#1e2330] text-[#16181c] dark:text-[#f8fafc] shadow-[0_1px_2px_rgba(22,24,28,.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-transparent dark:border-[#2a3042] font-semibold"
                                                : "text-[#8a8f89] dark:text-[#94a3b8] hover:text-[#16181c] dark:hover:text-[#f8fafc] hover:bg-black/[.04] dark:hover:bg-white/[.05]",
                                        )}
                                    >
                                        <span className="flex-1">
                                            {leaf.label}
                                        </span>
                                        <ChevronDown
                                            className="size-4 transition-transform group-open/pos:rotate-180 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    </summary>

                                    <ul className="mt-1 ml-3 flex flex-col gap-1 border-l border-[#dcdcd8] dark:border-[#242937] pl-3">
                                        {leaf.children.map((child) => {
                                            const childActive = isLeafActive(
                                                child,
                                                fullPath,
                                            );
                                            return (
                                                <li key={child.href}>
                                                    <Link
                                                        href={child.href}
                                                        onClick={onNavigate}
                                                        aria-current={
                                                            childActive
                                                                ? "page"
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                                                            childActive
                                                                ? "bg-primary/10 text-primary font-bold"
                                                                : "text-[#5c6660] dark:text-[#cbd5e1] hover:text-[#16181c] dark:hover:text-[#f8fafc] hover:bg-black/[.04] dark:hover:bg-white/[.05]",
                                                        )}
                                                    >
                                                        <span className="flex-1">
                                                            {child.label}
                                                        </span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </details>
                            </li>
                        );
                    }

                    return (
                        <li key={leaf.href}>
                            <Link
                                href={leaf.href}
                                onClick={onNavigate}
                                aria-current={leafActive ? "page" : undefined}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                                    leafActive
                                        ? "bg-white dark:bg-[#1e2330] text-[#16181c] dark:text-[#f8fafc] shadow-[0_1px_2px_rgba(22,24,28,.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-transparent dark:border-[#2a3042]"
                                        : "text-[#5c6660] dark:text-[#cbd5e1] hover:text-[#16181c] dark:hover:text-[#f8fafc] hover:bg-black/[.04] dark:hover:bg-white/[.05]",
                                )}
                            >
                                <span className="flex-1">{leaf.label}</span>
                                {leaf.badge !== undefined && (
                                    <span className="rounded-md bg-[#feb90d] px-1.5 py-0.5 text-[11px] font-medium text-[#3d2c00]">
                                        {leaf.badge}
                                    </span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
