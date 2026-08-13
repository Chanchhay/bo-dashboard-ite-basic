"use client";

import { useState } from "react";
import {
    AlertTriangle,
    Boxes,
    CircleDollarSign,
    PackageX,
    Search,
} from "lucide-react";

import { useMoney } from "@/hooks/useMoney";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
} from "@/components/inventory/InventoryUi";
import {
    StockLevelTable,
    type StockLevelRow,
} from "@/components/inventory/stock/StockLevelTable";
import { StockBatchesDialog } from "@/components/inventory/stock/StockBatchesDialog";
import { StockMovementDialog } from "@/components/inventory/stock/StockMovementDialog";
import { useStockLevels } from "@/components/inventory/stock/useStockLevels";
import { Input } from "@/components/ui/input";
import { type StockState } from "@/lib/api/inventory";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setStockSearch } from "@/store/inventoryUiSlice";

function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    hint?: string;
    icon: typeof Boxes;
    accent: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div
                className={`grid size-10 place-items-center rounded-xl ${accent}`}
            >
                <Icon className="size-5" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
                {value}
            </p>
            {hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

/**
 * Stock at a glance: what every item holds, and what that is worth.
 *
 * Add-ons and the movements ledger are pages of their own in the sidebar. They
 * answer different questions — what an item offers, and what happened — and
 * neither is read alongside these totals.
 */
export function InventoryStock() {
    const { format: formatMoney } = useMoney();
    const dispatch = useAppDispatch();
    const stockSearch = useAppSelector(
        (state) => state.inventoryUi.stockSearch,
    );
    const {
        items,
        addOns,
        itemRows,
        addOnRows,
        onHandFor,
        itemTarget,
        addOnTarget,
        openMovement,
        recordMovement,
        pending,
        dialogOpen,
        setDialogOpen,
        recording,
        isLoading,
        error,
        retry,
    } = useStockLevels();

    /** The item whose deliveries are being looked at, if any. */
    const [batchesForItemId, setBatchesForItemId] = useState<string | null>(
        null,
    );

    const normalizedSearch = stockSearch.trim().toLowerCase();
    const visibleItems = itemRows.filter(({ item }) =>
        !normalizedSearch ||
        [item.name, item.sku, item.barcode]
            .filter(Boolean)
            .some((value) =>
                String(value).toLowerCase().includes(normalizedSearch),
            ),
    );

    const countState = (state: StockState) =>
        itemRows.filter((row) => row.state === state).length;

    /**
     * What the shop's stock is worth: every open batch at the price it was
     * bought at, worked out by the API from the batches themselves.
     *
     * Add-ons count too — a tub of pearls was paid for like anything else, and
     * they are stocked from this screen.
     */
    const stockValue = [...itemRows, ...addOnRows]
        .map((row) => row.value ?? 0)
        .reduce((total, value) => total + value, 0);
    const uncosted = [...itemRows, ...addOnRows].filter(
        (row) => row.value === undefined && row.onHand > 0,
    ).length;

    if (isLoading) {
        return <InventoryLoading label="Loading stock" />;
    }

    if (error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    error,
                    "Unable to load stock information.",
                )}
                retry={retry}
            />
        );
    }

    const batchesItem = visibleItems.find(
        (row) => row.item.id === batchesForItemId,
    )?.item;

    const itemLevelRows: StockLevelRow[] = visibleItems.map((row) => ({
        id: row.item.id,
        name: row.item.name || "Unnamed",
        subtitle: row.item.sku || "No SKU",
        onHand: row.onHand,
        unitLabel: row.item.unit?.name || "",
        threshold: row.item.lowStockDefault ?? 0,
        state: row.state,
        valueAtCost: row.value,
        pendingChange: row.pendingChange,
        // Each option counts its own stock; the item's figure is their sum.
        options: row.options.map((option) => ({
            ...option,
            unitLabel: row.item.unit?.name || "",
        })),
        unassigned: row.unassigned,
        addOns: (row.item.addOns || []).map((addOn) => ({
            id: addOn.id,
            name: addOn.name || "Unnamed add-on",
            onHand: onHandFor(addOn.id),
            unitLabel: addOn.baseUnit?.name || "",
            usePerOrder: addOn.usePerOrder ?? undefined,
        })),
    }));

    /**
     * Add-ons no item offers.
     *
     * An add-on is stocked from under the item that offers it, which leaves
     * one that nothing offers with nowhere to be counted. It still holds
     * stock somebody paid for, so it is listed on its own rather than being
     * dropped off the screen.
     */
    const looseAddOnRows: StockLevelRow[] = addOnRows
        .filter(
            (row) =>
                !items.some((item) =>
                    (item.addOns || []).some(
                        (addOn) => addOn.id === row.addOn.id,
                    ),
                ),
        )
        .map((row) => ({
            id: row.addOn.id,
            name: row.addOn.name || "Unnamed add-on",
            subtitle: row.addOn.baseUnit?.name
                ? `Counted in ${row.addOn.baseUnit.name}`
                : "No unit set",
            onHand: row.onHand,
            unitLabel: row.addOn.baseUnit?.name || "",
            threshold: 0,
            state: row.state,
            valueAtCost: row.value,
            pendingChange: 0,
        }));

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Stock"
                description="Record what comes in and what goes out. Every change is a movement, so the history stays complete."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Tracked"
                    value={String(items.length + addOns.length)}
                    hint={`${items.length} ${items.length === 1 ? "item" : "items"} · ${addOns.length} add-${addOns.length === 1 ? "on" : "ons"}`}
                    icon={Boxes}
                    accent="bg-success/10 text-success"
                />
                <MetricCard
                    label="Stock value at cost"
                    value={formatMoney(stockValue)}
                    hint={
                        uncosted
                            ? `${uncosted} with stock but no cost recorded`
                            : "Every batch at the price it was bought at"
                    }
                    icon={CircleDollarSign}
                    accent="bg-warning/10 text-warning"
                />
                <MetricCard
                    label="Low stock"
                    value={String(countState("LOW"))}
                    icon={AlertTriangle}
                    accent="bg-warning/15 text-warning"
                />
                <MetricCard
                    label="Out of stock"
                    value={String(countState("OUT"))}
                    icon={PackageX}
                    accent="bg-danger/10 text-danger"
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-foreground">Items</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Counted in each item&apos;s base unit.
                        </p>
                    </div>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={stockSearch}
                            onChange={(event) =>
                                dispatch(setStockSearch(event.target.value))
                            }
                            placeholder="Search"
                            className="h-10 rounded-xl border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                <StockLevelTable
                    rows={itemLevelRows}
                    emptyTitle={
                        items.length ? "No matching items" : "No items to track"
                    }
                    emptyDescription={
                        items.length
                            ? "Change the search."
                            : "Create an item before recording stock."
                    }
                    valueColumnLabel="Value at cost"
                    formatValue={formatMoney}
                    pageUnitNoun="items"
                    onStockIn={(id) => openMovement(itemTarget(id)!, "IN")}
                    onStockOut={(id) => openMovement(itemTarget(id)!, "OUT")}
                    onStockInOption={(id, variantId) =>
                        openMovement(itemTarget(id, variantId)!, "IN")
                    }
                    onStockOutOption={(id, variantId) =>
                        openMovement(itemTarget(id, variantId)!, "OUT")
                    }
                    onStockInAddOn={(addOnId) =>
                        openMovement(addOnTarget(addOnId)!, "IN")
                    }
                    onStockOutAddOn={(addOnId) =>
                        openMovement(addOnTarget(addOnId)!, "OUT")
                    }
                    onViewBatches={setBatchesForItemId}
                />
            </section>

            {looseAddOnRows.length ? (
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    <div className="border-b border-border p-4">
                        <h2 className="font-semibold text-foreground">
                            Add-ons not offered by any item
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Every other add-on is stocked under the item that
                            offers it. These belong to none, so they are
                            counted here.
                        </p>
                    </div>

                    <StockLevelTable
                        rows={looseAddOnRows}
                        emptyTitle="No loose add-ons"
                        emptyDescription="Every add-on is offered by an item."
                        valueColumnLabel="Value at cost"
                        formatValue={formatMoney}
                        pageUnitNoun="add-ons"
                        onStockIn={(id) =>
                            openMovement(addOnTarget(id)!, "IN")
                        }
                        onStockOut={(id) =>
                            openMovement(addOnTarget(id)!, "OUT")
                        }
                    />
                </section>
            ) : null}

            <StockMovementDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                target={pending?.target ?? null}
                direction={pending?.direction ?? "IN"}
                onRecord={recordMovement}
                busy={recording}
            />

            {batchesForItemId ? (
                <StockBatchesDialog
                    itemId={batchesForItemId}
                    itemName={batchesItem?.name || "Item"}
                    unitName={batchesItem?.unit?.name}
                    open
                    onOpenChange={(next) =>
                        setBatchesForItemId(next ? batchesForItemId : null)
                    }
                />
            ) : null}
        </div>
    );
}
