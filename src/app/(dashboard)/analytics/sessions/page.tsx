import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { SessionHistory } from "@/components/analytics/SessionHistory";

/**
 * Every shift the till has run, and whether the drawer counted true.
 *
 * The profit screen says what the shop made; this says who was on the register
 * when it made it, and whether the cash that came out matched the cash the
 * sales say should have.
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
