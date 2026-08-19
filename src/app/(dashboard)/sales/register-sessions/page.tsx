import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { SessionHistory } from "@/components/sales/SessionHistory";

/**
 * Every shift the till has run, and whether the drawer counted true.
 *
 * Sits with the till rather than with the reports: the question it answers is
 * whether the cash that came out of the drawer matched the cash the sales say
 * should have, which is the cashier's business at the end of a shift and the
 * owner's the morning after — not a figure anyone reads for the trend.
 */
export default function SessionHistoryPage() {
    return (
        <div className="flex w-full flex-col gap-6">
            <InventoryPageHeader
                title="Register sessions"
                description="Every shift the till has run, what it took in cash, and how the count came out."
            />

            <SessionHistory />
        </div>
    );
}
