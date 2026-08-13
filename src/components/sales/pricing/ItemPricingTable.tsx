"use client";

import { ChevronLeft, ChevronRight, PackageSearch, Pencil } from "lucide-react";

import { ItemChannelChips } from "@/components/sales/pricing/ItemChannelChips";
import {
    linesOf,
    toOverride,
    type DraftOverride,
} from "@/components/sales/pricing/channel-lines";
import {
    addOnKey,
    draftAmount,
    soldAsRowsOf,
    type UnitCostLookup,
    type PriceDrafts,
} from "@/components/sales/pricing/sold-as";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { InventoryItem } from "@/lib/api/inventory";
import type { SalesChannel } from "@/lib/api/sales-channels";
import { effectivePrice, type PriceOverride } from "@/lib/sale-pricing/pricing";
import { cn } from "@/lib/utils";

/**
 * The catalogue as a table, because a catalogue is a list of the same thing.
 *
 * Cards read well for five items and stop reading at a hundred: the eye has to
 * re-find the price on every card, and the category headings that made them
 * navigable turn into scrolling. A table puts every price in one column, makes
 * category a column that the filter above already narrows, and pages the rest —
 * searching and scanning are how you get to one item, not scrolling.
 */

export const pageSizes = [25, 50, 100] as const;

/** What one row says, worked out once so the cells can stay dumb. */
function baseSummary(
    item: InventoryItem,
    unitCostFor: UnitCostLookup,
    addOnCosts: Map<string, number>,
    drafts: PriceDrafts,
) {
    const rows = soldAsRowsOf(item, unitCostFor);
    const addOns = item.addOns || [];
    const prices = rows
        .map((row) => draftAmount(drafts[row.key], row.saved))
        .filter((price): price is number => price !== undefined);

    // Only prices actually changed count as unsaved: a rule applied to
    // everything fills boxes that may already hold the same number.
    const edited =
        rows.some((row) => {
            const typed = drafts[row.key];

            return (
                typed !== undefined &&
                draftAmount(typed, row.saved) !== (row.saved ?? undefined)
            );
        }) ||
        addOns.some((addOn) => {
            const typed = drafts[addOnKey(addOn.id)];

            return (
                addOnCosts.has(addOn.id) &&
                typed !== undefined &&
                draftAmount(typed, addOn.price) !== (addOn.price ?? undefined)
            );
        });

    return {
        ways: rows.length,
        addOns: addOns.length,
        unpriced: rows.length - prices.length,
        lowest: prices.length ? Math.min(...prices) : undefined,
        highest: prices.length ? Math.max(...prices) : undefined,
        edited,
    };
}

/** The same, for what one channel charges once its rules are applied. */
function channelSummary(
    item: InventoryItem,
    overrides: Record<string, DraftOverride>,
    globalRule: PriceOverride | undefined,
) {
    const lines = linesOf(item);
    const prices = lines
        .map((line) => {
            const override = overrides[line.key];

            return effectivePrice(
                line.base,
                override ? toOverride(override.kind, override.value) : undefined,
                globalRule,
            );
        })
        .filter((price): price is number => price !== undefined);

    return {
        ways: lines.length,
        changed: lines.filter(
            (line) =>
                overrides[line.key]?.kind &&
                overrides[line.key].kind !== "INHERIT",
        ).length,
        lowest: prices.length ? Math.min(...prices) : undefined,
        highest: prices.length ? Math.max(...prices) : undefined,
    };
}

function PriceRange({
    lowest,
    highest,
    format,
}: {
    lowest?: number;
    highest?: number;
    format: (value: number) => string;
}) {
    if (lowest === undefined) {
        return (
            <span className="text-sm text-muted-foreground">Not priced</span>
        );
    }

    return (
        <span className="text-sm font-bold text-foreground tabular-nums">
            {lowest === highest
                ? format(lowest)
                : `${format(lowest)} – ${format(highest!)}`}
        </span>
    );
}

/** Name, SKU and whether Inventory will let it be sold at all. */
function ItemCell({
    item,
    detail,
    flag,
}: {
    item: InventoryItem;
    detail: string;
    flag?: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                    {item.name || "Unnamed item"}
                </span>
                {item.sku ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {item.sku}
                    </span>
                ) : null}
                {item.status === "INACTIVE" ? (
                    <span
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                        title="Set in Inventory — an inactive item cannot be sold on any channel"
                    >
                        Unavailable
                    </span>
                ) : null}
                {flag}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
    );
}

export function ItemPricingTable({
    scope,
    items,
    channels,
    channelsByItem,
    format,
    unitCosts,
    unitCostFor,
    addOnCosts,
    drafts,
    overrides,
    enabled,
    globalRule,
    channelName,
    onEdit,
    onToggle,
    onManageChannels,
}: {
    scope: "BASE" | "CHANNEL";
    /** Just this page of them. */
    items: InventoryItem[];
    channels: SalesChannel[];
    channelsByItem: Map<string, Set<string>>;
    format: (value: number) => string;
    unitCosts: Map<string, number>;
    /** What one base unit of a given option of a given item cost. */
    unitCostFor: (itemId: string) => UnitCostLookup;
    addOnCosts: Map<string, number>;
    drafts: PriceDrafts;
    overrides: Record<string, DraftOverride>;
    /** Item ids the channel sells. Ignored on base. */
    enabled: Set<string>;
    globalRule?: PriceOverride;
    channelName?: string;
    onEdit: (itemId: string) => void;
    onToggle: (itemId: string, on: boolean) => void;
    onManageChannels: (itemId: string) => void;
}) {
    const isBase = scope === "BASE";

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-56">Item</TableHead>
                        <TableHead className="hidden min-w-32 lg:table-cell">
                            Category
                        </TableHead>
                        <TableHead className="min-w-32">
                            {isBase ? "Sells for" : "Sells for here"}
                        </TableHead>
                        {isBase ? null : (
                            <TableHead className="w-28">Selling</TableHead>
                        )}
                        <TableHead className="w-32">Channels</TableHead>
                        <TableHead className="w-28 text-right">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {items.map((item) => {
                        const listed = enabled.has(item.id);
                        const sellable = item.status !== "INACTIVE";
                        const canPrice = unitCosts.has(item.id);

                        const summary = isBase
                            ? baseSummary(
                                  item,
                                  unitCostFor(item.id),
                                  addOnCosts,
                                  drafts,
                              )
                            : channelSummary(item, overrides, globalRule);

                        const detail = isBase
                            ? [
                                  `${summary.ways} way${summary.ways === 1 ? "" : "s"} to buy it`,
                                  "addOns" in summary && summary.addOns
                                      ? `${summary.addOns} add on${summary.addOns === 1 ? "" : "s"}`
                                      : null,
                                  canPrice &&
                                  "unpriced" in summary &&
                                  summary.unpriced
                                      ? `${summary.unpriced} not priced yet`
                                      : null,
                              ]
                                  .filter(Boolean)
                                  .join(" · ")
                            : `${summary.ways} unit${summary.ways === 1 ? "" : "s"}${
                                  listed ? "" : " · not sold on this channel"
                              }`;

                        return (
                            <TableRow key={item.id}>
                                <TableCell className="py-3">
                                    <ItemCell
                                        item={item}
                                        detail={detail}
                                        flag={
                                            isBase &&
                                            "edited" in summary &&
                                            summary.edited ? (
                                                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                                    Unsaved
                                                </span>
                                            ) : !isBase &&
                                              "changed" in summary &&
                                              summary.changed ? (
                                                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                                    {summary.changed} override
                                                    {summary.changed === 1
                                                        ? ""
                                                        : "s"}
                                                </span>
                                            ) : null
                                        }
                                    />
                                </TableCell>

                                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                                    {item.itemGroup?.name || "—"}
                                </TableCell>

                                <TableCell>
                                    {isBase && !canPrice ? (
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning"
                                            title="Record a stock in with a unit cost for this item before pricing it"
                                        >
                                            <PackageSearch className="size-3.5 shrink-0" />
                                            Needs a stock in
                                        </span>
                                    ) : !isBase && !listed ? (
                                        <span className="text-sm text-muted-foreground">
                                            —
                                        </span>
                                    ) : (
                                        <PriceRange
                                            lowest={summary.lowest}
                                            highest={summary.highest}
                                            format={format}
                                        />
                                    )}
                                </TableCell>

                                {isBase ? null : (
                                    <TableCell>
                                        <Switch
                                            checked={listed}
                                            disabled={!sellable}
                                            onCheckedChange={(checked) =>
                                                onToggle(
                                                    item.id,
                                                    Boolean(checked),
                                                )
                                            }
                                            aria-label={`Sell ${item.name} on ${channelName}`}
                                        />
                                    </TableCell>
                                )}

                                <TableCell>
                                    <ItemChannelChips
                                        channels={channels}
                                        liveOn={
                                            channelsByItem.get(item.id) ??
                                            new Set()
                                        }
                                        onManage={() =>
                                            onManageChannels(item.id)
                                        }
                                    />
                                </TableCell>

                                <TableCell className="text-right">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={!isBase && !listed}
                                        onClick={() => onEdit(item.id)}
                                        title={
                                            !isBase && !listed
                                                ? "Turn this item on for the channel before pricing it here"
                                                : undefined
                                        }
                                        className="gap-1.5"
                                    >
                                        <Pencil className="size-3.5" />
                                        Set prices
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * Which slice of the catalogue is showing, and how to get to the next.
 *
 * Says the range rather than only the page number: "26–50 of 137" tells you
 * how much is left, which is the thing a page number never does.
 */
export function TablePagination({
    total,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
}: {
    total: number;
    /** One-based. */
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground sm:text-sm">
                {total === 0
                    ? "No items"
                    : `${first}–${last} of ${total} item${total === 1 ? "" : "s"}`}
            </p>

            <div className="flex items-center gap-2.5">
                <div className="w-30">
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) =>
                            onPageSizeChange(Number(value) || pageSizes[0])
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            aria-label="Rows per page"
                            className={cn(
                                controlClassName,
                                "!h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold",
                            )}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizes.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size} per page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Previous page"
                    className="gap-1"
                >
                    <ChevronLeft className="size-4" />
                    Prev
                </Button>

                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {page} / {pageCount}
                </span>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Next page"
                    className="gap-1"
                >
                    Next
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
