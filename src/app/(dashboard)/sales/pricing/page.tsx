import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { ItemPricingTab } from "@/components/sales/pricing/ItemPricingTab";

/**
 * Base prices and what each channel does to them, on one screen.
 *
 * This used to be three: Set Price, Channel Pricing, and a channel matrix,
 * each rebuilding the same catalogue to answer a third of the same question.
 * They differed only in whose price was being set, so that became a control
 * on the screen rather than a screen of its own.
 */
export default function SalesPricingPage() {
    return (
        <div className="flex w-full flex-col gap-6">
            <InventoryPageHeader
                title="Item & Pricing"
                description="Set base prices, then what each channel sells and charges — one catalogue, one place."
            />

            <ItemPricingTab />
        </div>
    );
}
