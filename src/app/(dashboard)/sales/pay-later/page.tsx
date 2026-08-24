import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { PayLaterList } from "@/components/sales/PayLaterList";

/** Sales rung up as "Pay later" — sold, stock gone, money not collected yet. */
export default function PayLaterPage() {
    return (
        <div className="flex w-full flex-col gap-6">
            <InventoryPageHeader
                title="Pay Later"
                description="Sales closed without collecting money yet. Settle them here once the cash comes in."
            />

            <PayLaterList />
        </div>
    );
}
