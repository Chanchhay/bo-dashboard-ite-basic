"use client";

import { TourButton } from "@/components/onboarding/TourButton";
import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
} from "@/components/inventory/InventoryUi";
import { StockMovementsTab } from "@/components/inventory/stock/StockMovementsTab";
import { useStockLevels } from "@/components/inventory/stock/useStockLevels";

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
        <div data-tour="stock-movements-ledger" className="flex flex-col gap-6">
            {/* Header Section (Static on phone/tablet, Sticky on desktop) */}
            <div className="static lg:sticky lg:top-0 lg:z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-2 pb-2.5 bg-shell/95 lg:backdrop-blur-md transition-all">
                <InventoryPageHeader
                    title="Movements"
                    description="Every stock in, stock out and adjustment, newest first. A recorded movement is never edited — it is corrected with an adjustment."
                    action={<TourButton />}
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <StockMovementsTab
                    entries={entries}
                    targets={movementTargets}
                />
            </section>
        </div>
    );
}
