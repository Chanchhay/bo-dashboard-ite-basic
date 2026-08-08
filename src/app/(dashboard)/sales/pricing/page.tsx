"use client";

import { useState } from "react";
import { Store, Tags } from "lucide-react";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ItemsPricingTab } from "@/components/sales/pricing/ItemsPricingTab";
import { SellingProductsTab } from "@/components/sales/pricing/SellingProductsTab";

const tabs = [
    { id: "items", label: "Items & Pricing", icon: Tags },
    { id: "selling", label: "Selling Products", icon: Store },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SalesPricingPage() {
    const [tab, setTab] = useState<TabId>("items");

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Items &amp; pricing"
                description="Set what everything costs, then choose where it sells and whether that channel charges anything different."
            />

            <p
                className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning"
                role="status"
            >
                Preview — sample catalogue, nothing is saved yet. The API is
                built once this flow is approved.
            </p>

            <div
                role="tablist"
                aria-label="Items and pricing"
                className="scrollbar-none -mx-1 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden"
            >
                <div className="flex w-max min-w-full items-center gap-1 rounded-2xl border border-border bg-card p-1">
                    {tabs.map((entry) => {
                        const Icon = entry.icon;
                        const active = entry.id === tab;

                        return (
                            <button
                                key={entry.id}
                                type="button"
                                role="tab"
                                id={`pricing-tab-${entry.id}`}
                                aria-selected={active}
                                aria-controls={`pricing-panel-${entry.id}`}
                                onClick={() => setTab(entry.id)}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:text-sm ${
                                    active
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                <Icon className="size-4 shrink-0" />
                                {entry.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                role="tabpanel"
                id={`pricing-panel-${tab}`}
                aria-labelledby={`pricing-tab-${tab}`}
            >
                {tab === "items" ? <ItemsPricingTab /> : <SellingProductsTab />}
            </div>
        </div>
    );
}
