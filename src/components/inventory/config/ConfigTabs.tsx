"use client";

import {
    FolderTree,
    ListChecks,
    PlusCircle,
    Ruler,
} from "lucide-react";

export const configTabs = [
    { id: "units", label: "Units", icon: Ruler },
    { id: "groups", label: "Item groups", icon: FolderTree },
    { id: "add-ons", label: "Add-ons", icon: PlusCircle },
    { id: "presets", label: "Option presets", icon: ListChecks },
] as const;

export type ConfigTabId = (typeof configTabs)[number]["id"];

/**
 * Sub-tabs, not routes: switching between the building blocks is a move inside
 * one screen, so it shouldn't cost a navigation or a scroll position.
 */
export function ConfigTabs({
    value,
    onChange,
}: {
    value: ConfigTabId;
    onChange: (id: ConfigTabId) => void;
}) {
    return (
        <div
            role="tablist"
            aria-label="Item configuration"
            className="scrollbar-none -mx-1 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden"
        >
            <div data-tour="inventory-config-tabs" className="flex w-max min-w-full items-center gap-1 rounded-2xl border border-border bg-card p-1">
                {configTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = tab.id === value;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`config-tab-${tab.id}`}
                            aria-selected={active}
                            aria-controls={`config-panel-${tab.id}`}
                            onClick={() => onChange(tab.id)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-sm ${
                                active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            <Icon className="size-4 shrink-0" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
