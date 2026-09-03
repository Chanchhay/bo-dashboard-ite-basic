import { CreateInventoryProduct } from "@/components/inventory/InventoryProductForm";
import { TourButton } from "@/components/onboarding/TourButton";

export default function CreateInventoryProductPage() {
    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Fill in the item name, SKU, barcode, base unit, category, and low-stock level to add a new item. Prices are set in Sale Management.
                </p>
                <TourButton />
            </div>

            <CreateInventoryProduct />
        </div>
    );
}
