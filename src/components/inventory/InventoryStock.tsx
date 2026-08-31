"use client";

import { useState } from "react";
import {
    AlertTriangle,
    Boxes,
    Calendar,
    CircleDollarSign,
    PackageX,
    Search,
} from "lucide-react";

import { useMoney } from "@/hooks/useMoney";

import { TourButton } from "@/components/onboarding/TourButton";
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

import { DatePicker, toDateValue, type DateValue } from "@/components/ui/date-picker";
import { useGetStockEntriesQuery } from "@/services/inventoryApi";
import { cn } from "@/lib/utils";

function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
    active = false,
    onClick,
}: {
    label: string;
    value: string;
    hint?: string;
    icon: typeof Boxes;
    accent: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full text-left rounded-xl sm:rounded-2xl border-0 bg-white dark:bg-card p-3 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all cursor-pointer hover:shadow-md",
                active && " dark:bg-primary/10",
            )}
        >
            <div
                className={cn(
                    "grid size-8 sm:size-10 place-items-center rounded-lg sm:rounded-xl",
                    accent,
                )}
            >
                <Icon className="size-4 sm:size-5" />
            </div>
            <p className="mt-2.5 sm:mt-4 text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-semibold text-foreground truncate">
                {value}
            </p>
            {hint ? (
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">{hint}</p>
            ) : null}
        </button>
    );
}

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
    const entriesQuery = useGetStockEntriesQuery();

    const [batchesForItemId, setBatchesForItemId] = useState<string | null>(
        null,
    );
    const [stateFilter, setStateFilter] = useState<"ALL" | StockState>("ALL");
    const [datePreset, setDatePreset] = useState<string>("ALL");
    const [fromDate, setFromDate] = useState<DateValue>("");
    const [toDate, setToDate] = useState<DateValue>("");

    function handlePresetChange(preset: string) {
        setDatePreset(preset);
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        if (preset === "ALL") {
            setFromDate("");
            setToDate("");
        } else if (preset === "TODAY") {
            setFromDate(todayStr);
            setToDate(todayStr);
        } else if (preset === "7DAYS") {
            const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setFromDate(past.toISOString().split("T")[0]);
            setToDate(todayStr);
        } else if (preset === "30DAYS") {
            const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setFromDate(past.toISOString().split("T")[0]);
            setToDate(todayStr);
        }
    }

    const normalizedSearch = stockSearch.trim().toLowerCase();
    const visibleItems = itemRows.filter(({ item, state }) => {
        const matchesSearch =
            !normalizedSearch ||
            [item.name, item.sku, item.barcode]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(normalizedSearch),
                );
        const matchesState = stateFilter === "ALL" || state === stateFilter;

        let matchesDate = true;
        if (fromDate || toDate) {
            const itemEntries = (entriesQuery.data || []).filter(
                (entry) => entry.itemId === item.id,
            );

            const itemCreatedRaw =
                (item as unknown as { createdDate?: string; createdAt?: string }).createdDate ||
                (item as unknown as { createdDate?: string; createdAt?: string }).createdAt;

            const earliestEntryDate = itemEntries.length > 0
                ? itemEntries
                    .map((e) => e.createdDate || (e as unknown as { createdAt?: string }).createdAt)
                    .filter(Boolean)
                    .sort()[0]
                : null;

            const itemDateStr = String(itemCreatedRaw || earliestEntryDate || "").slice(0, 10);

            const itemDateMatch = itemDateStr
                ? (!fromDate || itemDateStr >= fromDate) && (!toDate || itemDateStr <= toDate)
                : false;

            const entryMatch = itemEntries.length > 0 && itemEntries.some((entry) => {
                const entryDate = String(
                    entry.createdDate ||
                    (entry as unknown as { createdAt?: string }).createdAt ||
                    ""
                ).slice(0, 10);
                if (!entryDate) return false;
                if (fromDate && entryDate < fromDate) return false;
                if (toDate && entryDate > toDate) return false;
                return true;
            });

            matchesDate = itemDateMatch || entryMatch;
        }

        return matchesSearch && matchesState && matchesDate;
    });

    const countState = (state: StockState) =>
        itemRows.filter((row) => row.state === state).length;

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

    const itemLevelRows: StockLevelRow[] = visibleItems.map((row) => {
        const itemCreatedRaw =
            (row.item as unknown as { createdDate?: string; createdAt?: string }).createdDate ||
            (row.item as unknown as { createdDate?: string; createdAt?: string }).createdAt;

        const itemEntries = (entriesQuery.data || []).filter(
            (entry) => entry.itemId === row.item.id,
        );

        const earliestEntryDate = itemEntries.length > 0
            ? itemEntries
                .map((e) => e.createdDate || (e as unknown as { createdAt?: string }).createdAt)
                .filter(Boolean)
                .sort()[0]
            : null;

        const dateToDisplay = itemCreatedRaw || earliestEntryDate;

        const createdFormatted = dateToDisplay
            ? new Date(dateToDisplay).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            })
            : null;

        return {
            id: row.item.id,
            name: row.item.name || "Unnamed",
            subtitle: [
                row.item.sku || "No SKU",
                createdFormatted
                    ? itemCreatedRaw
                        ? `Created ${createdFormatted}`
                        : `Stock ${createdFormatted}`
                    : null,
            ]
                .filter(Boolean)
                .join(" · "),
            onHand: row.onHand,
            unitLabel: row.item.unit?.name || "",
            threshold: row.item.lowStockDefault ?? 0,
            state: row.state,
            valueAtCost: row.value,
            pendingChange: row.pendingChange,
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
        };
    });

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
        <div data-tour="inventory-stock-overview" className="flex flex-col gap-6 pb-12 sm:pb-16">
            <div className="static lg:sticky lg:top-0 lg:z-20 -mx-5 px-5 lg:-mx-8 lg:px-8 pt-4 pb-4 bg-shell/95 lg:backdrop-blur-md transition-all">
                <InventoryPageHeader
                    title="Stock"
                    description="Record what comes in and what goes out. Every change is a movement, so the history stays complete."
                    action={<TourButton />}
                />

                <div data-tour="stock-metrics" className="mt-4 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Tracked"
                        value={String(items.length + addOns.length)}
                        hint={`${items.length} ${items.length === 1 ? "item" : "items"} · ${addOns.length} add-${addOns.length === 1 ? "on" : "ons"}`}
                        icon={Boxes}
                        accent="bg-success/10 text-success"
                        active={stateFilter === "ALL"}
                        onClick={() => setStateFilter("ALL")}
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
                        active={stateFilter === "LOW"}
                        onClick={() => setStateFilter("LOW")}
                    />
                    <MetricCard
                        label="Out of stock"
                        value={String(countState("OUT"))}
                        icon={PackageX}
                        accent="bg-danger/10 text-danger"
                        active={stateFilter === "OUT"}
                        onClick={() => setStateFilter("OUT")}
                    />
                </div>
            </div>

            <section className="overflow-clip rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-3 sm:gap-4 border-b border-border p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-semibold text-foreground">Items</h2>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
                            Counted in each item&apos;s base unit.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                        <div data-tour="stock-search" className="relative w-full sm:w-48 lg:w-60">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={stockSearch}
                                onChange={(event) =>
                                    dispatch(setStockSearch(event.target.value))
                                }
                                placeholder="Search items..."
                                className="h-9 sm:h-10 rounded-xl border border-border bg-card pl-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground shadow-xs w-full"
                            />
                        </div>

                        {/* State Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-muted/60 p-1 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setStateFilter("ALL")}
                                className={cn(
                                    "shrink-0 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    stateFilter === "ALL"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setStateFilter("IN")}
                                className={cn(
                                    "shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    stateFilter === "IN"
                                        ? "bg-card text-success shadow-xs font-bold"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <span className="size-2 rounded-full bg-success" />
                                In stock ({countState("IN")})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStateFilter("LOW")}
                                className={cn(
                                    "shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    stateFilter === "LOW"
                                        ? "bg-warning/20 text-warning shadow-xs font-bold ring-1 ring-warning/30"
                                        : "text-muted-foreground hover:text-warning",
                                )}
                            >
                                <AlertTriangle className="size-3.5 text-warning" />
                                Low stock ({countState("LOW")})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStateFilter("OUT")}
                                className={cn(
                                    "shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    stateFilter === "OUT"
                                        ? "bg-danger/20 text-danger shadow-xs font-bold ring-1 ring-danger/30"
                                        : "text-muted-foreground hover:text-danger",
                                )}
                            >
                                <PackageX className="size-3.5 text-danger" />
                                Out of stock ({countState("OUT")})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Styled Date Filter Bar matching /inventory/stock/movements */}
                <div data-tour="movements-date-filter" className="flex flex-col gap-3 p-3.5 sm:p-4 border-t border-border/60 text-sm bg-card lg:flex-row lg:items-center lg:justify-between">
                    {/* Date Presets */}
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto py-0.5">
                        <span className="font-semibold text-foreground mr-1 flex items-center gap-1.5 shrink-0 text-xs sm:text-sm">
                            <Calendar className="size-4 text-primary" />
                            <span>Date:</span>
                        </span>
                        {[
                            { id: "ALL", label: "All Time" },
                            { id: "TODAY", label: "Today" },
                            { id: "7DAYS", label: "Last 7 Days" },
                            { id: "30DAYS", label: "Last 30 Days" },
                        ].map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handlePresetChange(p.id)}
                                className={cn(
                                    "shrink-0 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap",
                                    datePreset === p.id && !fromDate && !toDate
                                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                        : datePreset === p.id
                                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Clean Custom Calendar Inputs */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0">From:</span>
                            <div className="flex-1 sm:w-40 md:w-44 min-w-0">
                                <DatePicker
                                    value={fromDate}
                                    max={toDate || undefined}
                                    placeholder="Any date"
                                    className="h-9 text-xs sm:text-sm"
                                    onValueChange={(value) => {
                                        setFromDate(value);
                                        setDatePreset("CUSTOM");
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0">To:</span>
                            <div className="flex-1 sm:w-40 md:w-44 min-w-0">
                                <DatePicker
                                    value={toDate}
                                    min={fromDate || undefined}
                                    placeholder="Any date"
                                    className="h-9 text-xs sm:text-sm"
                                    onValueChange={(value) => {
                                        setToDate(value);
                                        setDatePreset("CUSTOM");
                                    }}
                                />
                            </div>
                        </div>
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
