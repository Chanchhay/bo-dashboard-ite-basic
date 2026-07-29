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
                className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 sm:w-fit"
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
                                "flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00932a]",
                                selected
                                    ? "bg-[#f2f3f1] text-[#16181c]"
                                    : "text-[#8a8f89] hover:text-[#16181c]",
                            )}
                        >
                            <Icon
                                className={cn(
                                    "size-4",
                                    selected && "text-[#00932a]",
                                )}
                                aria-hidden="true"
                            />
                            {tab.label}
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
