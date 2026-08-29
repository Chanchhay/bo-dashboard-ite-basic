import { TriangleAlert } from "lucide-react";
import { TourButton } from "@/components/onboarding/TourButton";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { backendRequest } from "@/lib/api/backend";
import {
    getAllInventoryItems,
    getInventoryBusinessId,
} from "@/lib/api/inventory-backend";
import type { InventoryItem, StockSummary } from "@/lib/api/inventory";

type Overview = {
    items: InventoryItem[];
    stock: StockSummary[];
    error?: string;
};

async function loadOverview(): Promise<Overview> {
    try {
        const businessId = await getInventoryBusinessId();
        const [items, stock] = await Promise.all([
            getAllInventoryItems(businessId),
            backendRequest<StockSummary[]>(
                `/api/v1/businesses/${businessId}/stock-entries/current`,
            ),
        ]);

        return { items: items ?? [], stock: stock ?? [] };
    } catch {
        return {
            items: [],
            stock: [],
            error: "We couldn't reach the inventory service, so these figures are unavailable.",
        };
    }
}

export default async function DashboardPage() {
    const { items, stock, error } = await loadOverview();

    return (
        <div className="flex flex-col gap-6 pb-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Business Dashboard
                    </h1>
                    <p className="max-w-2xl text-[14px] text-[#5c6660] dark:text-[#94a3b8] mt-1">
                        Monitor live store metrics, channel revenues, cumulative profit, and stock inventory.
                    </p>
                </div>
                <TourButton />
            </div>

            {error && (
                <p
                    role="status"
                    className="flex items-start gap-2.5 rounded-2xl border border-[#f0d9a8] bg-[#fff9ec] px-4 py-3 text-[14px] text-[#8a5f00]"
                >
                    <TriangleAlert
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    {error}
                </p>
            )}

            {/* Overview Dashboard with 3 KPI cards & 2x2 Grid Charts (Profit, Channels Pie, Trending Category, Stock Inventory) */}
            <OverviewDashboard items={items} stock={stock} />
        </div>
    );
}
