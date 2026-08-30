import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { PredictionTables } from "@/components/analytics/PredictionTables";
import { TourButton } from "@/components/onboarding/TourButton";

export default function PredictionPage() {
    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <InventoryPageHeader
                    title="Prediction"
                    description="What's likely to sell more, run out, or need restocking next."
                />
                <TourButton />
            </div>

            <PredictionTables />
        </div>
    );
}
