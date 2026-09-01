

import { InventoryProductList } from "@/components/inventory/InventoryProductList";
import { TourButton } from "@/components/onboarding/TourButton";

export default function InventoryPage() {
    return (
        <div className="pb-4">
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Master list of all products, retail selling prices, barcodes, SKUs, and stock on hand.
                </p>
                <TourButton />
            </div>

            <InventoryProductList />
        </div>
    );
}
