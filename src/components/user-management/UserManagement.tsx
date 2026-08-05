"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ScrollText, ShieldCheck, Users } from "lucide-react";

import AuditsTab from "@/components/user-management/AuditsTab";
import RolesTab from "@/components/user-management/RolesTab";
import StaffTab from "@/components/user-management/StaffTab";
import { cn } from "@/lib/utils";

type TabId = "users" | "roles" | "audits";

const TABS: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "roles", label: "Roles & permissions", icon: ShieldCheck },
    { id: "audits", label: "Audits", icon: ScrollText },
];

export default function UserManagement({
    canReadAudits,
}: {
    /** `admin-audit:read` — the audit log is a platform-admin endpoint. */
    canReadAudits: boolean;
}) {
    const [active, setActive] = useState<TabId>("users");
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Arrow keys move between tabs, as expected of a tablist.
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(event.key)) return;

        event.preventDefault();
        const index = TABS.findIndex((tab) => tab.id === active);
        const next =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? TABS.length - 1
                  : event.key === "ArrowLeft"
                    ? (index - 1 + TABS.length) % TABS.length
                    : (index + 1) % TABS.length;

        setActive(TABS[next].id);
        tabRefs.current[TABS[next].id]?.focus();
    };

    return (
        <div className="flex flex-col gap-5 pb-4">
            <div
                role="tablist"
                aria-label="User management sections"
                onKeyDown={onKeyDown}
                className="grid w-full grid-cols-3 gap-1 rounded-2xl bg-white dark:bg-[#1a1e29] border border-transparent dark:border-[#242937] p-1 sm:p-1.5 sm:flex sm:w-fit"
            >
                {TABS.map((tab) => {
                    const selected = tab.id === active;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                tabRefs.current[tab.id] = el;
                            }}
                            type="button"
                            role="tab"
                            id={`tab-${tab.id}`}
                            aria-selected={selected}
                            aria-controls={`panel-${tab.id}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => setActive(tab.id)}
                            className={cn(
                                "flex min-w-0 w-full items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-1.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary sm:w-auto sm:min-w-max",
                                selected
                                    ? "bg-[#f2f3f1] dark:bg-[#252a38] text-[#16181c] dark:text-[#f8fafc] shadow-sm"
                                    : "text-[#8a8f89] dark:text-[#94a3b8] hover:text-[#16181c] dark:hover:text-[#f8fafc]",
                            )}
                        >
                            <Icon
                                className={cn(
                                    "size-3.5 sm:size-4 shrink-0",
                                    selected ? "text-primary" : "dark:text-[#94a3b8]",
                                )}
                                aria-hidden="true"
                            />
                            <span className="truncate">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div
                role="tabpanel"
                id={`panel-${active}`}
                aria-labelledby={`tab-${active}`}
                tabIndex={0}
                className="outline-none"
            >
                {active === "users" && <StaffTab />}
                {active === "roles" && <RolesTab />}
                {active === "audits" && (
                    <AuditsTab canReadAudits={canReadAudits} />
                )}
            </div>
        </div>
    );
}
