"use client";

import { History, Package, PlusCircle } from "lucide-react";

export const stockTabs = [
    { id: "items", label: "Items", icon: Package },
    { id: "movements", label: "Movements", icon: History },
] as const;

export type StockTabId = (typeof stockTabs)[number]["id"];

export function StockTabs({
    value,
    onChange,
    counts,
}: {
    value: StockTabId;
    onChange: (id: StockTabId) => void;
    counts: Record<StockTabId, number>;
}) {
    return (
        <div
            role="tablist"
            aria-label="Stock"
            className="scrollbar-none -mx-1 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden"
        >
            <div className="flex w-max min-w-full items-center gap-1 rounded-2xl border border-border bg-card p-1">
                {stockTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = tab.id === value;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`stock-tab-${tab.id}`}
                            aria-selected={active}
                            aria-controls={`stock-panel-${tab.id}`}
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
