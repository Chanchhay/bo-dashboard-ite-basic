"use client";

import { useState } from "react";

import { ProfitByChannel } from "@/components/analytics/ProfitByChannel";
import { ProfitByPeriod } from "@/components/analytics/ProfitByPeriod";
import { cn } from "@/lib/utils";

const tabs = {
    PERIODS: "Statement",
    CHANNELS: "By channel",
} as const;

type ProfitTab = keyof typeof tabs;

export function ProfitTabs() {
    const [tab, setTab] = useState<ProfitTab>("PERIODS");

    return (
        <div className="flex flex-col gap-4">
            <div
                role="tablist"
                aria-label="Profit view"
                className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1"
            >
                {Object.entries(tabs).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value as ProfitTab)}
                        className={cn(
                            "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                            tab === value
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === "PERIODS" ? <ProfitByPeriod /> : <ProfitByChannel />}
        </div>
    );
}
