import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ProfitByChannel } from "@/components/analytics/ProfitByChannel";
import { TourButton } from "@/components/onboarding/TourButton";

/**
 * What the business made, across everywhere it sells.
 *
 * Profit rather than revenue: a shop pricing per channel can be taking its
 * best money on the channel it keeps the least of, and revenue alone will
 * never say so.
 */
export default function AnalyticsPage() {
    return (
        <div data-tour="analytics-overview" className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <InventoryPageHeader
                    title="Profit"
                    description="What each sales channel took, what it cost you, and what you kept."
                />
                <TourButton />
            </div>

            <ProfitByChannel />
        </div>
    );
}
