import { useState } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
} from "lucide-react";

import { InventoryEmpty } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { stockStateLabels, type StockState } from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

const pageSizes = [10, 25, 50, 100];

const stateClassName: Record<StockState, string> = {
    OUT: "bg-danger/10 text-danger",
    LOW: "bg-warning/15 text-warning",
    IN: "bg-success/10 text-success",
};

export type StockLevelRow = {
    id: string;
    /**
     * The heading this row is filed under, when the table is grouped.
     *
     * Add-ons are listed under the item that offers them, and one add-on can
     * be offered by several items, so the same add-on appears once per group —
     * which is why the group id, not the row id, makes a row unique.
     */
    group?: { id: string; label: string; hint?: string };
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
    /**
     * The item's options, each counting its own stock.
     *
     * `unassigned` on the row is what is still held against the item itself —
     * only ever non-zero where stock was recorded before the item had options.
     */
    options?: {
        id: string;
        name: string;
        available: boolean;
        onHand: number;
        unitLabel: string;
        state: StockState;
    }[];
    unassigned?: number;
    /** Extras attached to this item, each counted on its own. */
    addOns?: {
        id: string;
        name: string;
        onHand: number;
        unitLabel: string;
        usePerOrder?: number;
    }[];
};

/**
 * The extras attached to this item, each with the stock it holds.
 *
 * An add-on is counted in its own right — a tub of pearls runs out whether it
 * was scooped into one drink or ten — so it carries a balance here rather than
 * borrowing the item's. It is never sold alone, which is why it appears under
 * the item that offers it as well as in its own tab.
 */
function StockItemAddOnsTreeRow({
    row,
    onStockIn,
    onStockOut,
}: {
    row: StockLevelRow;
    onStockIn?: (addOnId: string) => void;
    onStockOut?: (addOnId: string) => void;
}) {
    const addOns = row.addOns || [];

    return (
        <div className="space-y-2 py-1">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Add-ons · {addOns.length}
            </p>

            <div className="relative ml-3 space-y-1.5 border-l-2 border-primary/20 pl-4 dark:border-primary/30">
                {addOns.map((addOn) => (
                    <div
                        key={addOn.id}
                        className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-2.5 transition-colors hover:border-border/40 hover:bg-muted/40"
                    >
                        <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 -translate-y-1/2 bg-primary/30 dark:bg-primary/40" />

                        <div className="flex min-w-0 items-center gap-3">
                            {/* <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                                <FolderPlus className="size-4" />
                            </span> */}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {addOn.name}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {addOn.usePerOrder === undefined
                                        ? "Counted on its own"
                                        : `Uses ${formatAmount(addOn.usePerOrder)} ${addOn.unitLabel} per order`}
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                {formatAmount(addOn.onHand)}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                    {addOn.unitLabel}
                                </span>
                            </span>

                            {/* An add-on is shared, so this is the same stock
                                wherever it is stocked from. */}
                            {onStockIn ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onStockIn(addOn.id)}
                                    aria-label={`Stock in ${addOn.name}`}
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
                                    disabled={addOn.onHand <= 0}
                                    title={
                                        addOn.onHand <= 0
                                            ? "Nothing on hand to remove"
                                            : undefined
                                    }
                                    onClick={() => onStockOut(addOn.id)}
                                    aria-label={`Stock out ${addOn.name}`}
                                >
                                    <ArrowUpFromLine />
                                    Out
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * The item's options, each with the stock it holds.
 *
 * An option is counted in its own right — running out of Large is not running
 * out of the item — so each carries its own balance and is stocked on its own.
 * The item's figure above is their sum.
 */
function StockItemOptionsRow({
    row,
    onStockIn,
    onStockOut,
}: {
    row: StockLevelRow;
    onStockIn?: (id: string, variantId: string) => void;
    onStockOut?: (id: string, variantId: string) => void;
}) {
    const options = row.options || [];

    return (
        <div className="space-y-2 py-1">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Options · {options.length}
            </p>

            <div className="relative ml-3 space-y-1.5 border-l-2 border-primary/20 pl-4 dark:border-primary/30">
                {options.map((option) => (
                    <div
                        key={option.id}
                        className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-2.5 transition-colors hover:border-border/40 hover:bg-muted/40"
                    >
                        <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 -translate-y-1/2 bg-primary/30 dark:bg-primary/40" />

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {option.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatAmount(option.onHand)}{" "}
                                {option.unitLabel} on hand
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                    stateClassName[option.state],
                                )}
                            >
                                {stockStateLabels[option.state]}
                            </span>
                            <span
                                className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                    option.available
                                        ? "bg-success/10 text-success"
                                        : "bg-muted text-muted-foreground",
                                )}
                            >
                                {option.available ? "On sale" : "Off sale"}
                            </span>

                            {onStockIn ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onStockIn(row.id, option.id)}
                                    aria-label={`Stock in ${row.name} ${option.name}`}
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
                                    disabled={option.onHand <= 0}
                                    title={
                                        option.onHand <= 0
                                            ? "Nothing on hand to remove"
                                            : undefined
                                    }
                                    onClick={() => onStockOut(row.id, option.id)}
                                    aria-label={`Stock out ${row.name} ${option.name}`}
                                >
                                    <ArrowUpFromLine />
                                    Out
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Only ever non-zero on an item stocked before it had options. */}
            {row.unassigned ? (
                <p className="text-xs text-muted-foreground">
                    {formatAmount(row.unassigned)} {row.unitLabel} is still
                    held against the item as a whole, from before it had
                    options. Move it onto an option with an adjustment.
                </p>
            ) : null}
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
    onStockInOption,
    onStockOutOption,
    onStockInAddOn,
    onStockOutAddOn,
    onViewBatches,
    pageUnitNoun = "rows",
}: {
    rows: readonly StockLevelRow[];
    emptyTitle: string;
    emptyDescription: string;
    valueColumnLabel: string;
    formatValue: (value: number) => string;
    onStockIn?: (id: string) => void;
    onStockOut?: (id: string) => void;
    onAdjust?: (id: string) => void;
    /** Moving one option of an item, which counts its own stock. */
    onStockInOption?: (id: string, variantId: string) => void;
    onStockOutOption?: (id: string, variantId: string) => void;
    /**
     * Moving an add-on the item offers. It is shared, so this is the same
     * stock wherever it is reached from — the add-on's id is all it takes.
     */
    /** Opens the deliveries behind one item, oldest first. */
    onViewBatches?: (id: string) => void;
    onStockInAddOn?: (addOnId: string) => void;
    onStockOutAddOn?: (addOnId: string) => void;
    /** What a page is counted in, for the footer: "items", "add-ons", … */
    pageUnitNoun?: string;
}) {
    const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(
        new Set(),
    );
    // Groups start open; collapsing is the exception, so only those are held.
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
        new Set(),
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    /**
     * A search that narrows the list must not leave you on a page past the
     * end, so any change to what is being listed starts again from the first.
     *
     * The caller rebuilds `rows` on every render, so what is being listed is
     * compared by the ids it contains rather than by the array's identity.
     */
    const rowsSignature = rows
        .map((row) => `${row.group?.id ?? ""}:${row.id}`)
        .join("|");
    const [listedRows, setListedRows] = useState(rowsSignature);

    if (listedRows !== rowsSignature) {
        setListedRows(rowsSignature);
        setPage(1);
    }

    const toggleRowAddOns = (id: string) => {
        setExpandedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleGroup = (id: string) => {
        setCollapsedGroupIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const hasActions = Boolean(onStockIn || onStockOut || onAdjust);
    const columnCount = hasActions ? 6 : 5;

    /**
     * Rows in the order given, with a heading started whenever the group
     * changes. The caller decides the order; the table only marks the seams.
     */
    const sections = rows.reduce<
        { group?: StockLevelRow["group"]; rows: StockLevelRow[] }[]
    >((built, row) => {
        const last = built.at(-1);

        if (last && last.group?.id === row.group?.id) {
            last.rows.push(row);
        } else {
            built.push({ group: row.group, rows: [row] });
        }

        return built;
    }, []);

    /**
     * A page holds whole sections when the table is grouped, so an item's
     * add-ons are never split across two pages, and a collapsed group still
     * takes its place in the list rather than vanishing from it.
     */
    const isGrouped = sections.some((section) => section.group);
    const pageUnits = isGrouped
        ? sections
        : rows.map((row) => ({ group: undefined, rows: [row] }));
    const pageCount = Math.max(1, Math.ceil(pageUnits.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const firstIndex = (currentPage - 1) * pageSize;
    const visibleUnits = pageUnits.slice(firstIndex, firstIndex + pageSize);
    const allCollapsed =
        isGrouped &&
        sections.every((section) =>
            section.group ? collapsedGroupIds.has(section.group.id) : true,
        );

    if (rows.length === 0) {
        return (
            <InventoryEmpty title={emptyTitle} description={emptyDescription} />
        );
    }

    return (
        <div className="flex flex-col">
            {isGrouped ? (
                <div className="flex justify-end border-b border-border px-5 py-2.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            setCollapsedGroupIds(
                                allCollapsed
                                    ? new Set()
                                    : new Set(
                                          sections
                                              .map(
                                                  (section) =>
                                                      section.group?.id,
                                              )
                                              .filter(
                                                  (id) => id !== undefined,
                                              ),
                                      ),
                            )
                        }
                    >
                        <ChevronDown
                            className={cn(
                                "size-4 transition-transform duration-200",
                                allCollapsed ? "-rotate-90" : "rotate-0",
                            )}
                        />
                        {allCollapsed ? "Expand all" : "Collapse all"}
                    </Button>
                </div>
            ) : null}

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
                    {visibleUnits.flatMap((section) => {
                        const group = section.group;
                        const collapsed = group
                            ? collapsedGroupIds.has(group.id)
                            : false;

                        const heading = group ? (
                            <tr
                                key={`group-${group.id}`}
                                className="bg-muted/30"
                            >
                                <td
                                    colSpan={columnCount}
                                    className="px-5 py-2.5"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.id)}
                                        aria-expanded={!collapsed}
                                        className="flex w-full cursor-pointer flex-wrap items-baseline gap-2 text-left"
                                    >
                                        <ChevronDown
                                            className={cn(
                                                "size-4 self-center text-muted-foreground transition-transform duration-200",
                                                collapsed
                                                    ? "-rotate-90"
                                                    : "rotate-0",
                                            )}
                                        />
                                        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                                            {group.label}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            {section.rows.length}
                                            {group.hint
                                                ? ` · ${group.hint}`
                                                : ""}
                                        </span>
                                    </button>
                                </td>
                            </tr>
                        ) : null;

                        if (collapsed) return heading ? [heading] : [];

                        const sectionRows = section.rows.flatMap((row) => {
                            const rowKey = `${section.group?.id ?? ""}:${row.id}`;
                            // Only a row with something under it can be opened.
                            const expandable = Boolean(
                                row.options?.length || row.addOns?.length,
                            );
                            const isExpanded =
                                expandable && expandedRowIds.has(rowKey);

                            const mainRow = (
                                <tr
                                    key={rowKey}
                                    className={cn(
                                        "text-foreground hover:bg-muted/50 transition-colors",
                                        isExpanded && "bg-muted/30 font-medium",
                                    )}
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">{row.name}</p>
                                                {expandable ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRowAddOns(rowKey)}
                                                        aria-label={`Toggle options and add-ons for ${row.name}`}
                                                        aria-expanded={isExpanded}
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
                                                ) : null}
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
                                                {/* An item sold in options is
                                                    stocked through them: its
                                                    own figure is their sum, so
                                                    moving "the item" would
                                                    belong to no option. */}
                                                {row.options?.length ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleRowAddOns(rowKey)
                                                        }
                                                        className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                                                    >
                                                        Stock by option
                                                    </button>
                                                ) : null}
                                                {onViewBatches ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onViewBatches(row.id)
                                                        }
                                                        title="What this cost, delivery by delivery"
                                                        className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                                                    >
                                                        Batches
                                                    </button>
                                                ) : null}
                                                {onStockIn && !row.options?.length ? (
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
                                                {onStockOut && !row.options?.length ? (
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
                                <tr key={`${rowKey}-addons-tree`} className="bg-muted/20">
                                    <td colSpan={columnCount} className="px-5 py-4 border-b border-border">
                                        <>
                                            {row.options?.length ? (
                                                <StockItemOptionsRow
                                                    row={row}
                                                    onStockIn={onStockInOption}
                                                    onStockOut={onStockOutOption}
                                                />
                                            ) : null}
                                            {row.addOns?.length ? (
                                                <StockItemAddOnsTreeRow
                                                    row={row}
                                                    onStockIn={onStockInAddOn}
                                                    onStockOut={onStockOutAddOn}
                                                />
                                            ) : null}
                                        </>
                                    </td>
                                </tr>
                            );

                            return [mainRow, treeRow];
                        });

                        return heading
                            ? [heading, ...sectionRows]
                            : sectionRows;
                    })}
                </tbody>
            </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="first-letter:uppercase">
                        {pageUnitNoun} per page
                    </span>
                    <SelectField
                        id={`stock-page-size-${pageUnitNoun}`}
                        name={`stock-page-size-${pageUnitNoun}`}
                        value={String(pageSize)}
                        onValueChange={(value) => {
                            setPageSize(Number(value));
                            setPage(1);
                        }}
                        options={pageSizes.map((size) => ({
                            value: String(size),
                            label: String(size),
                        }))}
                        className="h-9 w-20 rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        {firstIndex + 1}–{firstIndex + visibleUnits.length} of{" "}
                        {pageUnits.length} {pageUnitNoun}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Previous page"
                            disabled={currentPage <= 1}
                            onClick={() =>
                                setPage((current) => Math.max(1, current - 1))
                            }
                        >
                            <ChevronLeft />
                        </Button>
                        <span className="text-sm font-medium text-foreground">
                            Page {currentPage} of {pageCount}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Next page"
                            disabled={currentPage >= pageCount}
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(pageCount, current + 1),
                                )
                            }
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
