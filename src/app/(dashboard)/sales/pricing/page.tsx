"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ItemsPricingTab } from "@/components/sales/pricing/ItemsPricingTab";
import { SellingProductsTab } from "@/components/sales/pricing/SellingProductsTab";

type TabId = "items" | "selling";

function SalesPricingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const tabParam = searchParams.get("tab");

    const [tab, setTab] = useState<TabId>(() => {
        return tabParam === "selling" ? "selling" : "items";
    });

    useEffect(() => {
        if (tabParam === "selling") {
            setTab("selling");
        } else if (tabParam === "items") {
            setTab("items");
        }
    }, [tabParam]);

    function handleTabChange(nextTab: TabId) {
        setTab(nextTab);
        router.push(`${pathname}?tab=${nextTab}`);
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <InventoryPageHeader
                title={tab === "selling" ? "Channel Pricing" : "Set Price"}
                description={
                    tab === "selling"
                        ? "Configure channel-specific pricing rules and overrides for POS, Telegram, and Online Store."
                        : "Set master prices for your items across all sellable packages."
                }
            />

            <p
                className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning"
                role="status"
            >
                Preview — sample catalogue, nothing is saved yet. The API is
                built once this flow is approved.
            </p>

            <div>
                {tab === "selling" ? <SellingProductsTab /> : <ItemsPricingTab />}
            </div>
        </div>
    );
}

export default function SalesPricingPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading pricing...</div>}>
            <SalesPricingContent />
        </Suspense>
    );
}
