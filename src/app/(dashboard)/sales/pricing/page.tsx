import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ItemPricingTab } from "@/components/sales/pricing/ItemPricingTab";
import { TourButton } from "@/components/onboarding/TourButton";


export default function SalesPricingPage() {
    return (
        <div data-tour="pricing-channel-overrides" className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <InventoryPageHeader
                    title="Item & Pricing"
                    description="Set base prices, then what each channel sells and charges — one catalogue, one place."
                />
                <TourButton />
            </div>

            <ItemPricingTab />
        </div>
    );
}
