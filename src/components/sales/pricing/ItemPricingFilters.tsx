"use client";

import { useMemo } from "react";
import { ScanBarcode, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    itemTypeLabels,
    itemTypes,
    type InventoryItem,
} from "@/lib/api/inventory";
import { linesOf } from "@/components/sales/pricing/channel-lines";

/**
 * Finding one item to reprice, said once.
 *
 * Set Price and Channel Pricing each grew a search bar of their own, and the
 * two drifted — one grew filters, the other did not, and neither could be
 * fixed without fixing both. The combined tab asks the catalogue the same
 * questions whichever scope it is showing, so the asking lives here.
 */

export interface AdvancedFilterState {
    category: string;
    unit: string;
    itemType: string;
    sortBy: string;
    minPrice: string;
    maxPrice: string;
    sku: string;
    barcode: string;
}

export const initialFilters: AdvancedFilterState = {
    category: "ALL",
    unit: "ALL",
    itemType: "ALL",
    sortBy: "name,asc",
    minPrice: "",
    maxPrice: "",
    sku: "",
    barcode: "",
};

/** How many of the advanced fields are actually narrowing anything. */
export function countActiveFilters(filters: AdvancedFilterState) {
    let count = 0;

    if (filters.category !== "ALL") count++;
    if (filters.unit !== "ALL") count++;
    if (filters.itemType !== "ALL") count++;
    if (filters.minPrice !== "") count++;
    if (filters.maxPrice !== "") count++;
    if (filters.sku !== "") count++;
    if (filters.barcode !== "") count++;
    if (filters.sortBy !== "name,asc") count++;

    return count;
}

/**
 * The catalogue, narrowed and ordered.
 *
 * Prices are read off the sold-as lines rather than off `item.price`, because
 * an item sold only in options has no price of its own and would otherwise
 * fall out of every price filter as if it were free.
 */
export function filterAndSortItems(
    items: InventoryItem[],
    searchQuery: string,
    filters: AdvancedFilterState,
): InventoryItem[] {
    const query = searchQuery.trim().toLowerCase();

    const matched = items.filter((item) => {
        if (query) {
            const haystack = [
                item.name,
                item.sku,
                item.barcode,
                ...(item.variants || []).map((variant) => variant.name),
            ]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());

            if (!haystack.some((value) => value.includes(query))) return false;
        }

        if (
            filters.category !== "ALL" &&
            item.itemGroup?.id !== filters.category
        ) {
            return false;
        }

        if (filters.unit !== "ALL") {
            const soldByUnit =
                item.unit?.id === filters.unit ||
                (item.uomConversions || []).some(
                    (conversion) => conversion.unit?.id === filters.unit,
                );

            if (!soldByUnit) return false;
        }

        if (filters.itemType !== "ALL" && item.itemType !== filters.itemType) {
            return false;
        }

        if (
            filters.sku.trim() &&
            !(item.sku || "")
                .toLowerCase()
                .includes(filters.sku.toLowerCase().trim())
        ) {
            return false;
        }

        if (
            filters.barcode.trim() &&
            !(item.barcode || "")
                .toLowerCase()
                .includes(filters.barcode.toLowerCase().trim())
        ) {
            return false;
        }

        const prices = linesOf(item)
            .map((line) => line.base)
            .filter((price): price is number => price !== undefined);
        const lowest = prices.length ? Math.min(...prices) : 0;
        const highest = prices.length ? Math.max(...prices) : 0;

        if (filters.minPrice !== "") {
            const min = Number(filters.minPrice);
            if (Number.isFinite(min) && highest < min) return false;
        }

        if (filters.maxPrice !== "") {
            const max = Number(filters.maxPrice);
            if (Number.isFinite(max) && lowest > max) return false;
        }

        return true;
    });

    const priceOf = (item: InventoryItem, pick: "min" | "max") => {
        const prices = linesOf(item)
            .map((line) => line.base)
            .filter((price): price is number => price !== undefined);

        if (!prices.length) return 0;

        return pick === "min" ? Math.min(...prices) : Math.max(...prices);
    };

    return [...matched].sort((left, right) => {
        switch (filters.sortBy) {
            case "name,desc":
                return (right.name || "").localeCompare(left.name || "");
            case "sku,asc":
                return (left.sku || "").localeCompare(right.sku || "");
            case "price,asc":
                return priceOf(left, "min") - priceOf(right, "min");
            case "price,desc":
                return priceOf(right, "max") - priceOf(left, "max");
            case "name,asc":
            default:
                return (left.name || "").localeCompare(right.name || "");
        }
    });
}

/**
 * The search row, and the panel it opens.
 *
 * `extra` is where a scope hangs the controls only it has — the collapse-all
 * button when base prices are showing, the override filter when a channel is.
 */
export function ItemPricingFilters({
    items,
    searchQuery,
    onSearchChange,
    onScan,
    panelOpen,
    onPanelOpenChange,
    draftFilters,
    onDraftFiltersChange,
    onApply,
    onReset,
    activeFilterCount,
    extra,
}: {
    items: InventoryItem[];
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onScan: () => void;
    panelOpen: boolean;
    onPanelOpenChange: (open: boolean) => void;
    draftFilters: AdvancedFilterState;
    onDraftFiltersChange: (filters: AdvancedFilterState) => void;
    onApply: () => void;
    onReset: () => void;
    activeFilterCount: number;
    extra?: React.ReactNode;
}) {
    const categoryOptions = useMemo(() => {
        const byId = new Map<string, string>();

        for (const item of items) {
            if (item.itemGroup?.id) {
                byId.set(item.itemGroup.id, item.itemGroup.name || "Unnamed");
            }
        }

        return [...byId.entries()].map(([id, name]) => ({ id, name }));
    }, [items]);

    /**
     * Every unit anything is sold by, base units and packs alike.
     *
     * A shop filtering by "Case" means "show me what I sell by the case", and
     * a case is only ever a conversion.
     */
    const unitOptions = useMemo(() => {
        const byId = new Map<string, string>();

        for (const item of items) {
            if (item.unit?.id) {
                byId.set(item.unit.id, item.unit.name || "Unnamed unit");
            }

            for (const conversion of item.uomConversions || []) {
                if (conversion.unit?.id) {
                    byId.set(
                        conversion.unit.id,
                        conversion.unit.name || "Unnamed unit",
                    );
                }
            }
        }

        return [...byId.entries()].map(([id, label]) => ({ id, label }));
    }, [items]);

    function update<K extends keyof AdvancedFilterState>(
        field: K,
        value: AdvancedFilterState[K],
    ) {
        onDraftFiltersChange({ ...draftFilters, [field]: value });
    }

    return (
        <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                {/* Search input */}
                <div className="relative w-full sm:flex-1 min-w-0">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search items by name, SKU or barcode..."
                        aria-label="Search items"
                        className={`${controlClassName} !h-9 sm:!h-10 rounded-xl border-border bg-card pr-9 pl-10 text-xs sm:text-sm font-medium w-full`}
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            aria-label="Clear search"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-3.5 sm:size-4" />
                        </button>
                    ) : null}
                </div>

                {/* Actions: 2-column grid on mobile, flex on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onPanelOpenChange(!panelOpen)}
                        aria-expanded={panelOpen}
                        className="!h-9 sm:!h-10 w-full sm:w-auto justify-center shrink-0 gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 text-xs sm:text-sm font-semibold"
                    >
                        <SlidersHorizontal className="size-3.5 sm:size-4 shrink-0" />
                        <span>Advanced filters</span>
                        {activeFilterCount ? (
                            <span className="grid size-4.5 sm:size-5 place-items-center rounded-full bg-primary text-[10px] sm:text-xs font-bold text-primary-foreground">
                                {activeFilterCount}
                            </span>
                        ) : null}
                    </Button>

                    {/* Straight to the one item in your hand, which is the whole
                        point of a barcode on a pricing screen. */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onScan}
                        className="!h-9 sm:!h-10 w-full sm:w-auto justify-center shrink-0 gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 text-xs sm:text-sm font-semibold"
                    >
                        <ScanBarcode className="size-3.5 sm:size-4 shrink-0" />
                        <span>Scan barcode</span>
                    </Button>

                    {extra}
                </div>
            </div>

            {panelOpen ? (
                <div className="mt-2.5 animate-in rounded-2xl border border-border bg-card p-5 shadow-xs duration-200 fade-in slide-in-from-top-2 sm:p-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-bold text-foreground sm:text-lg">
                            Advanced filters
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Narrow the catalogue, then apply all fields together.
                        </p>
                    </div>

                    <div className="mt-5 grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Category
                            </Label>
                            <Select
                                value={draftFilters.category}
                                onValueChange={(value) =>
                                    update("category", value || "ALL")
                                }
                            >
                                <SelectTrigger
                                    className={`${controlClassName} h-10 rounded-xl border-border bg-card px-3.5 text-sm font-medium`}
                                >
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">
                                        All categories
                                    </SelectItem>
                                    {categoryOptions.map((option) => (
                                        <SelectItem
                                            key={option.id}
                                            value={option.id}
                                        >
                                            {option.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Unit
                            </Label>
                            <Select
                                value={draftFilters.unit}
                                onValueChange={(value) =>
                                    update("unit", value || "ALL")
                                }
                            >
                                <SelectTrigger
                                    className={`${controlClassName} h-10 rounded-xl border-border bg-card px-3.5 text-sm font-medium`}
                                >
                                    <SelectValue placeholder="ALL" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ALL</SelectItem>
                                    {unitOptions.map((unit) => (
                                        <SelectItem
                                            key={unit.id}
                                            value={unit.id}
                                        >
                                            {unit.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Item type
                            </Label>
                            <Select
                                value={draftFilters.itemType}
                                onValueChange={(value) =>
                                    update("itemType", value || "ALL")
                                }
                            >
                                <SelectTrigger
                                    className={`${controlClassName} h-10 rounded-xl border-border bg-card px-3.5 text-sm font-medium`}
                                >
                                    <SelectValue placeholder="ALL" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ALL</SelectItem>
                                    {itemTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {itemTypeLabels[type]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Sort by
                            </Label>
                            <Select
                                value={draftFilters.sortBy}
                                items={{
                                    "name,asc": "name,asc",
                                    "name,desc": "name,desc",
                                    "price,asc": "price,asc",
                                    "price,desc": "price,desc",
                                    "sku,asc": "sku,asc",
                                }}
                                onValueChange={(value) =>
                                    update("sortBy", value || "name,asc")
                                }
                            >
                                <SelectTrigger
                                    className={`${controlClassName} h-10 rounded-xl border-border bg-card px-3.5 text-sm font-medium`}
                                >
                                    <SelectValue placeholder="name,asc" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name,asc">
                                        name,asc
                                    </SelectItem>
                                    <SelectItem value="name,desc">
                                        name,desc
                                    </SelectItem>
                                    <SelectItem value="price,asc">
                                        price,asc
                                    </SelectItem>
                                    <SelectItem value="price,desc">
                                        price,desc
                                    </SelectItem>
                                    <SelectItem value="sku,asc">
                                        sku,asc
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Minimum price
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={draftFilters.minPrice}
                                onChange={(event) =>
                                    update("minPrice", event.target.value)
                                }
                                className={`${controlClassName} h-10 rounded-xl bg-card px-3.5 text-sm font-medium`}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Maximum price
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="No maximum"
                                value={draftFilters.maxPrice}
                                onChange={(event) =>
                                    update("maxPrice", event.target.value)
                                }
                                className={`${controlClassName} h-10 rounded-xl bg-card px-3.5 text-sm font-medium`}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                SKU
                            </Label>
                            <Input
                                type="text"
                                placeholder="Exact SKU"
                                value={draftFilters.sku}
                                onChange={(event) =>
                                    update("sku", event.target.value)
                                }
                                className={`${controlClassName} h-10 rounded-xl bg-card px-3.5 text-sm font-medium`}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-foreground">
                                Barcode
                            </Label>
                            <Input
                                type="text"
                                placeholder="Exact barcode"
                                value={draftFilters.barcode}
                                onChange={(event) =>
                                    update("barcode", event.target.value)
                                }
                                className={`${controlClassName} h-10 rounded-xl bg-card px-3.5 text-sm font-medium`}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            onClick={onApply}
                            className="h-10 rounded-xl px-6 text-sm font-semibold shadow-xs"
                        >
                            Apply filters
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onReset}
                            className="h-10 rounded-xl px-5 text-sm font-semibold"
                        >
                            Reset fields
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
