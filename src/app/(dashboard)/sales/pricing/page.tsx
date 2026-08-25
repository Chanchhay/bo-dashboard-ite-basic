import { ItemPricingTab } from "@/components/sales/pricing/ItemPricingTab";

export default function SalesPricingPage() {
    return (
        <div data-tour="pricing-channel-overrides" className="flex w-full flex-col pb-12 sm:pb-16">
            <ItemPricingTab />
        </div>
    );
}
