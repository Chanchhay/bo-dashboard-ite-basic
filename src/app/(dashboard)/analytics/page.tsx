import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { DailyRevenue } from "@/components/analytics/DailyRevenue";
import { ProfitByChannel } from "@/components/analytics/ProfitByChannel";

/**
 * What the business made, across everywhere it sells.
 *
 * Profit rather than revenue: a shop pricing per channel can be taking its
 * best money on the channel it keeps the least of, and revenue alone will
 * never say so.
 */
export default function AnalyticsPage() {
    return (
        <div className="flex w-full flex-col gap-6">
            <InventoryPageHeader
                title="Profit"
                description="What each sales channel took, what it cost you, and what you kept."
            />

            <ProfitByChannel />

            <DailyRevenue />
        </div>
    );
}
