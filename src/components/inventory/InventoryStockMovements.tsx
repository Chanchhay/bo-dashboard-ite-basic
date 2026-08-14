"use client";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
} from "@/components/inventory/InventoryUi";
import { StockMovementsTab } from "@/components/inventory/stock/StockMovementsTab";
import { useStockLevels } from "@/components/inventory/stock/useStockLevels";

/**
 * The ledger: every movement ever recorded, against items and add-ons alike.
 *
 * Items and add-ons still have to be loaded here — an entry carries only the
 * id of what moved, so names, units and today's balance come from them.
 */
export function InventoryStockMovements() {
    const { entries, movementTargets, isLoading, error, retry } =
        useStockLevels();

    if (isLoading) {
        return <InventoryLoading label="Loading movements" />;
    }

    if (error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    error,
                    "Unable to load stock movements.",
                )}
                retry={retry}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Movements"
                description="Every stock in, stock out and adjustment, newest first. A recorded movement is never edited — it is corrected with an adjustment."
            />

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <StockMovementsTab
                    entries={entries}
                    targets={movementTargets}
                />
            </section>
        </div>
    );
}
