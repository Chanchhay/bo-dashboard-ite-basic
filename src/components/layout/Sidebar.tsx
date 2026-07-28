"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Boxes, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    findSectionByPath,
    isLeafActive,
    isSectionActive,
    visibleSections,
    type NavSection,
} from "@/components/layout/navigation";
import type { Permission } from "@/lib/permissions";
import type { ViewMode } from "@/lib/view-mode";

export default function Sidebar({
    open,
    onClose,
    mode,
    permissions,
}: {
    open: boolean;
    onClose: () => void;
    mode: ViewMode;
    permissions: Permission[];
}) {
    const pathname = usePathname();

    const allowed = visibleSections(permissions);
    // In app view the shell belongs to the app you opened, so the sidebar shows
    // that app's own pages and nothing else. Routes that sit outside any app
    // (your profile, for instance) get just the way back.
    const current = findSectionByPath(pathname);
    const scoped = mode === "apps";
    const sections = scoped ? (current ? [current] : []) : allowed;

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
                    "fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-[#f7f7f6]",
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
                        href="/dashboard"
                        onClick={onClose}
                        aria-label="iPOS home"
                        className="grid size-11 place-items-center text-black text-4xl outline-none focus-visible:ring-2 focus-visible:ring-[#00932a] focus-visible:ring-offset-2"
                    >
                        Logo
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="grid size-11 place-items-center rounded-full text-[#5c6660] outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#00932a] lg:hidden"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <nav
                    aria-label={scoped ? (current?.label ?? "App") : "Main"}
                    className="flex-1 overflow-y-auto px-4 pb-6"
                >
                    {scoped && (
                        <Link
                            href="/dashboard"
                            onClick={onClose}
                            className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] text-[#5c6660] outline-none transition-colors hover:bg-black/[.04] hover:text-[#16181c] focus-visible:ring-2 focus-visible:ring-[#00932a]"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            All apps
                        </Link>
                    )}

                    <ul className="flex flex-col gap-1">
                        {sections.map((section) => (
                            <li key={section.id}>
                                <SectionItem
                                    section={section}
                                    pathname={pathname}
                                    onNavigate={onClose}
                                    /* Inside an app there is nothing else to
                                       collapse into, so it stays open. */
                                    locked={scoped}
                                />
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </>
    );
}

function SectionItem({
    section,
    pathname,
    onNavigate,
    locked = false,
}: {
    section: NavSection;
    pathname: string;
    onNavigate: () => void;
    locked?: boolean;
}) {
    const active = isSectionActive(section, pathname);
    // A section holding the current route starts open; the reader never has to
    // hunt for where they are.
    const [expanded, setExpanded] = useState(active);
    const isOpen = locked || expanded;
    const Icon = section.icon;

    const rowClass =
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00932a]";

    if (!section.children) {
        return (
            <Link
                href={section.href ?? "#"}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                    rowClass,
                    active
                        ? "bg-white text-[#16181c] shadow-[0_1px_2px_rgba(22,24,28,.08)]"
                        : "text-[#5c6660] hover:bg-black/[.04] hover:text-[#16181c]",
                )}
            >
                <Icon
                    className={cn(
                        "size-[18px] shrink-0",
                        active && "text-[#00932a]",
                    )}
                    aria-hidden="true"
                />
                {section.label}
            </Link>
        );
    }

    const panelId = `nav-${section.id}`;

    return (
        <>
            {locked ? (
                /* Not a control — there is nothing to collapse into. */
                <p className={cn(rowClass, "font-medium text-[#16181c]")}>
                    <Icon
                        className="size-[18px] shrink-0 text-[#00932a]"
                        aria-hidden="true"
                    />
                    {section.label}
                </p>
            ) : (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className={cn(
                        rowClass,
                        active
                            ? "text-[#16181c]"
                            : "text-[#5c6660] hover:bg-black/[.04] hover:text-[#16181c]",
                    )}
                >
                    <Icon
                        className={cn(
                            "size-[18px] shrink-0",
                            active && "text-[#00932a]",
                        )}
                        aria-hidden="true"
                    />
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronDown
                        className={cn(
                            "size-4 shrink-0 text-[#8a8f89] transition-transform duration-200",
                            expanded && "rotate-180",
                        )}
                        aria-hidden="true"
                    />
                </button>
            )}

            {isOpen && (
                <ul
                    id={panelId}
                    /* The rail is the only thing tying children to their parent,
                       so it sits on the list rather than each row. */
                    className="mt-1 ml-[26px] flex flex-col gap-1 border-l border-[#dcdcd8] pl-3"
                >
                    {section.children.map((leaf) => {
                        const leafActive = isLeafActive(leaf, pathname);

                        return (
                            <li key={leaf.href}>
                                <Link
                                    href={leaf.href}
                                    onClick={onNavigate}
                                    aria-current={
                                        leafActive ? "page" : undefined
                                    }
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00932a]",
                                        leafActive
                                            ? "bg-white text-[#16181c] shadow-[0_1px_2px_rgba(22,24,28,.08)]"
                                            : "text-[#8a8f89] hover:text-[#16181c]",
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
            )}
        </>
    );
}
