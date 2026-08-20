import { CreateInventoryProduct } from "@/components/inventory/InventoryProductForm";
import { TourButton } from "@/components/onboarding/TourButton";

export default function CreateInventoryProductPage() {
    return (
        <div className="pb-4">
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Fill in item name, SKU, barcode, unit, category, retail price, and stock levels to add a new product.
                </p>
                <TourButton />
            </div>

            <CreateInventoryProduct />
        </div>
    );
}
