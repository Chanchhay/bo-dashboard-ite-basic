import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ProfitTabs } from "@/components/analytics/ProfitTabs";
import { TourButton } from "@/components/onboarding/TourButton";

/**
 * What the business made — as a statement, and by where it was sold.
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
                    description="What you took, what it cost you, and what you kept."
                />
                <TourButton />
            </div>

            <ProfitTabs />
        </div>
    );
}
