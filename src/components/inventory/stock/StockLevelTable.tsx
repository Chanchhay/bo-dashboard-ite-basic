import { useState } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ChevronDown,
    FolderPlus,
    SlidersHorizontal,
} from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { stockStateLabels, type StockState } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

const stateClassName: Record<StockState, string> = {
    OUT: "bg-danger/10 text-danger",
    LOW: "bg-warning/15 text-warning",
    IN: "bg-success/10 text-success",
};

export type StockLevelRow = {
    id: string;
    name: string;
    /** SKU for an item; "N more orders" for an add-on. */
    subtitle: string;
    onHand: number;
    unitLabel: string;
    threshold: number;
    state: StockState;
    /** Undefined when no cost has ever been recorded against it. */
    valueAtCost?: number;
    /** Non-zero when unsaved movements are sitting on this row. */
    pendingChange: number;
    /** The item's variations, when it has any. */
    options?: { name: string; available: boolean }[];
};

function StockItemAddOnsTreeRow({ row }: { row: StockLevelRow }) {
    // Add-ons hold no stock of their own — what matters here is the unit they
    // are measured in and how much one selection uses.
    const [addOnStates, setAddOnStates] = useState<
        Record<string, { enabled: boolean; usePerOrder: string }>
    >({
        "a-pearls": { enabled: true, usePerOrder: "30 g per order" },
        "a-jelly": { enabled: true, usePerOrder: "30 g per order" },
        "a-pudding": { enabled: false, usePerOrder: "40 g per order" },
        "a-shot": { enabled: true, usePerOrder: "1 shot per order" },
        "a-syrup": { enabled: true, usePerOrder: "15 ml per order" },
    });

    const [collapsedCategories, setCollapsedCategories] = useState<
        Set<string>
    >(new Set());

    const toggleCategory = (catId: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    const toggleAddOn = (addOnId: string, enabled: boolean) => {
        setAddOnStates((prev) => ({
            ...prev,
            [addOnId]: {
                ...(prev[addOnId] || {
                    enabled: true,
                    usePerOrder: "1 per order",
                }),
                enabled,
            },
        }));
    };

    const categories = [
        {
            id: `toppings-${row.id}`,
            name: "Toppings & Ingredients",
            subtitle: "3 attached add-ons",
            addOns: [
                { id: "a-pearls", name: "Pearls (Tapioca)", code: "ADD-001" },
                { id: "a-jelly", name: "Grass Jelly", code: "ADD-002" },
                { id: "a-pudding", name: "Egg Pudding", code: "ADD-003" },
            ],
        },
        {
            id: `extras-${row.id}`,
            name: "Flavors & Extra Shots",
            subtitle: "2 attached add-ons",
            addOns: [
                { id: "a-shot", name: "Extra Espresso Shot", code: "ADD-004" },
                { id: "a-syrup", name: "Vanilla Flavor Syrup", code: "ADD-005" },
            ],
        },
    ];

    return (
        <div className="space-y-3 py-1">
            {categories.map((category) => {
                const isCollapsed = collapsedCategories.has(category.id);

                return (
                    <div
                        key={category.id}
                        className="rounded-2xl border border-border/80 bg-card p-3 shadow-sm transition-all"
                    >
                        {/* Category Header Card matching exact screenshot */}
                        <div
                            onClick={() => toggleCategory(category.id)}
                            className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-1 transition-colors hover:bg-muted/40"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                                    <FolderPlus className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <h5 className="font-semibold text-foreground text-sm truncate">
                                        {category.name}
                                    </h5>
                                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                                        {category.subtitle}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${category.name}`}
                                className="grid size-8 shrink-0 place-items-center rounded-full bg-muted/60 text-muted-foreground transition-all hover:bg-muted focus:outline-none"
                            >
                                <ChevronDown
                                    className={cn(
                                        "size-4 transition-transform duration-200",
                                        isCollapsed ? "-rotate-90" : "rotate-0",
                                    )}
                                />
                            </button>
                        </div>

                        {/* Subcategory Tree Branches matching exact screenshot */}
                        {!isCollapsed ? (
                            <div className="relative ml-9 border-l-2 border-primary/20 dark:border-primary/30 my-2.5 pl-4 space-y-1.5 pr-2">
                                {category.addOns.map((addOn) => {
                                    const state = addOnStates[addOn.id] || {
                                        enabled: true,
                                        usePerOrder: "1 per order",
                                    };

                                    return (
                                        <div
                                            key={addOn.id}
                                            className={cn(
                                                "relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-muted/40 border border-transparent hover:border-border/40",
                                                state.enabled
                                                    ? "opacity-100"
                                                    : "opacity-60 bg-muted/30",
                                            )}
                                        >
                                            {/* Horizontal branch line */}
                                            <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 bg-primary/30 dark:bg-primary/40 -translate-y-1/2" />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-foreground text-sm">
                                                        {addOn.name}
                                                    </p>
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                                                        {addOn.code}
                                                    </span>
                                                </div>

                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    Uses{" "}
                                                    <strong className="text-foreground">
                                                        {state.usePerOrder}
                                                    </strong>
                                                </p>
                                            </div>

                                            {/* Toggle Management */}
                                            <div className="shrink-0 ml-auto sm:ml-0">
                                                <Switch
                                                    id={`stock-switch-${row.id}-${addOn.id}`}
                                                    checked={state.enabled}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        toggleAddOn(
                                                            addOn.id,
                                                            checked,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * The item's options, listed under it.
 *
 * Stock is held against the item as a whole: the API keeps one balance per
 * item and its stock entries carry no variant, so an option cannot show a
 * count of its own without inventing one. Each row says where its quantity
 * lives instead of printing a number nobody recorded.
 */
function StockItemOptionsRow({ row }: { row: StockLevelRow }) {
    const options = row.options || [];

    return (
        <div className="space-y-2 py-1">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Options · {options.length}
            </p>

            <div className="relative ml-3 space-y-1.5 border-l-2 border-primary/20 pl-4 dark:border-primary/30">
                {options.map((option) => (
                    <div
                        key={option.name}
                        className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-2.5 transition-colors hover:border-border/40 hover:bg-muted/40"
                    >
                        <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 -translate-y-1/2 bg-primary/30 dark:bg-primary/40" />

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {option.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Counted with the item
                            </p>
                        </div>

                        <span
                            className={cn(
                                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                option.available
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground",
                            )}
                        >
                            {option.available ? "On sale" : "Off sale"}
                        </span>
                    </div>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">
                One balance covers every option. Per-option stock arrives when
                the API tracks a variant on each movement.
            </p>
        </div>
    );
}

export function StockLevelTable({
    rows,
    emptyTitle,
    emptyDescription,
    valueColumnLabel,
    formatValue,
    onStockIn,
    onStockOut,
    onAdjust,
}: {
    rows: readonly StockLevelRow[];
    emptyTitle: string;
    emptyDescription: string;
    valueColumnLabel: string;
    formatValue: (value: number) => string;
    onStockIn?: (id: string) => void;
    onStockOut?: (id: string) => void;
    onAdjust?: (id: string) => void;
}) {
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(
        new Set(),
    );

    const toggleRowAddOns = (id: string) => {
        setExpandedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (rows.length === 0) {
        return (
            <InventoryEmpty title={emptyTitle} description={emptyDescription} />
        );
    }

    const hasActions = Boolean(onStockIn || onStockOut || onAdjust);

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">On hand</th>
                        <th className="px-5 py-3">Warn below</th>
                        <th className="px-5 py-3">{valueColumnLabel}</th>
                        <th className="px-5 py-3">State</th>
                        {hasActions ? <th className="px-5 py-3 text-right">Record</th> : null}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.flatMap((row) => {
                        const isExpanded = expandedRowIds.has(row.id);

                        const mainRow = (
                            <tr
                                key={row.id}
                                className={cn(
                                    "text-foreground hover:bg-muted/50 transition-colors",
                                    isExpanded && "bg-muted/30 font-medium",
                                )}
                            >
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">{row.name}</p>
                                            <button
                                                type="button"
                                                onClick={() => toggleRowAddOns(row.id)}
                                                aria-label={`Toggle options and add-ons for ${row.name}`}
                                                className="grid size-7 shrink-0 place-items-center rounded-full bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:outline-none cursor-pointer"
                                                title="View options and add-ons"
                                            >
                                                <ChevronDown
                                                    className={cn(
                                                        "size-4 transition-transform duration-200",
                                                        isExpanded ? "rotate-180 text-primary" : "rotate-0",
                                                    )}
                                                />
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {row.subtitle}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="font-semibold">
                                        {formatAmount(row.onHand)}
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                        {row.unitLabel}
                                    </span>
                                    {row.pendingChange !== 0 ? (
                                        <span
                                            className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                row.pendingChange > 0
                                                    ? "bg-success/10 text-success"
                                                    : "bg-warning/15 text-warning"
                                            }`}
                                        >
                                            {row.pendingChange > 0 ? "+" : ""}
                                            {formatAmount(row.pendingChange)} unsaved
                                        </span>
                                    ) : null}
                                </td>
                                <td className="px-5 py-4 text-muted-foreground">
                                    {formatAmount(row.threshold)} {row.unitLabel}
                                </td>
                                <td className="px-5 py-4">
                                    {row.valueAtCost === undefined ? (
                                        <span
                                            className="text-muted-foreground"
                                            title="No cost recorded yet — record a stock in with a cost to value this"
                                        >
                                            No cost yet
                                        </span>
                                    ) : (
                                        formatValue(row.valueAtCost)
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateClassName[row.state]}`}
                                    >
                                        {stockStateLabels[row.state]}
                                    </span>
                                </td>
                                {hasActions ? (
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            {onStockIn ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onStockIn(row.id)}
                                                    aria-label={`Stock in ${row.name}`}
                                                >
                                                    <ArrowDownToLine />
                                                    In
                                                </Button>
                                            ) : null}
                                            {onStockOut ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={row.onHand <= 0}
                                                    title={
                                                        row.onHand <= 0
                                                            ? "Nothing on hand to remove"
                                                            : undefined
                                                    }
                                                    onClick={() => onStockOut(row.id)}
                                                    aria-label={`Stock out ${row.name}`}
                                                >
                                                    <ArrowUpFromLine />
                                                    Out
                                                </Button>
                                            ) : null}
                                            {onAdjust ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onAdjust(row.id)}
                                                    aria-label={`Adjust stock for ${row.name}`}
                                                >
                                                    <SlidersHorizontal className="size-3.5" />
                                                    Adjust
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                ) : null}
                            </tr>
                        );

                        if (!isExpanded) return [mainRow];

                        const treeRow = (
                            <tr key={`${row.id}-addons-tree`} className="bg-muted/20">
                                <td colSpan={hasActions ? 6 : 5} className="px-5 py-4 border-b border-border">
                                    <>
                                        {row.options?.length ? (
                                            <StockItemOptionsRow row={row} />
                                        ) : null}
                                        <StockItemAddOnsTreeRow row={row} />
                                    </>
                                </td>
                            </tr>
                        );

                        return [mainRow, treeRow];
                    })}
                </tbody>
            </table>
        </div>
    );
}
