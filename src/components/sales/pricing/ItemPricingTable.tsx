"use client";

import { PackageSearch, Pencil } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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

export const pageSizes = [10, 20, 25, 50, 100] as const;

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
    const isChannelListed = (itemId: string) => enabled.has(itemId);

    return (
        <div
            data-tour="pricing-table"
            className="overflow-clip rounded-2xl border border-border bg-card shadow-xs"
        >
            {/* Mobile Cards (< md) */}
            <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
                {items.map((item) => {
                    const sellable = item.status !== "INACTIVE";
                    const listed = isBase ? sellable : isChannelListed(item.id);
                    const canPrice = isBase ? Boolean(unitCostFor(item.id)) : true;

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
                        : `${summary.ways} unit${summary.ways === 1 ? "" : "s"}${listed ? "" : " · not sold on this channel"}`;

                    return (
                        <div
                            key={item.id}
                            onClick={() => {
                                if (isBase || listed) {
                                    onEdit(item.id);
                                }
                            }}
                            className={cn(
                                "rounded-2xl border border-border bg-card dark:bg-[#151c28] shadow-xs overflow-hidden transition-all",
                                (isBase || listed) && "cursor-pointer hover:border-primary/40 active:scale-[0.99]"
                            )}
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-[#0e1420] border-b border-border/70 dark:border-slate-800/80">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm text-foreground dark:text-white truncate">
                                            {item.name || "Unnamed item"}
                                        </span>
                                        {item.sku && (
                                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                                {item.sku}
                                            </span>
                                        )}
                                        {item.status === "INACTIVE" && (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                Unavailable
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={!isBase && !listed}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(item.id);
                                    }}
                                    className="h-7 px-2 text-xs font-semibold gap-1 shrink-0"
                                >
                                    <Pencil className="size-3" />
                                    Prices
                                </Button>
                            </div>

                            {/* Card Key-Value Rows */}
                            <div className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                                <div className="flex items-center justify-between px-3.5 py-2.5">
                                    <span className="text-muted-foreground dark:text-slate-400">Category</span>
                                    <span className="font-medium text-foreground dark:text-slate-200">
                                        {item.itemGroup?.name || "—"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between px-3.5 py-2.5">
                                    <span className="text-muted-foreground dark:text-slate-400">Price Range</span>
                                    <div>
                                        {isBase && !canPrice ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                                <PackageSearch className="size-3 shrink-0" />
                                                Needs a stock in
                                            </span>
                                        ) : !isBase && !listed ? (
                                            <span className="text-muted-foreground">—</span>
                                        ) : (
                                            <PriceRange
                                                lowest={summary.lowest}
                                                highest={summary.highest}
                                                format={format}
                                            />
                                        )}
                                    </div>
                                </div>

                                {!isBase && (
                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <span className="text-muted-foreground dark:text-slate-400">Sell on {channelName}</span>
                                        <div onClick={(e) => e.stopPropagation()}>
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
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/10 dark:bg-slate-900/30" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-muted-foreground dark:text-slate-400">Channels</span>
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
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="min-w-64">Item</TableHead>
                            <TableHead className="hidden lg:table-cell">
                                Category
                            </TableHead>
                            <TableHead>
                                {isBase ? "Base price" : `${channelName} price`}
                            </TableHead>
                            {isBase ? null : (
                                <TableHead className="w-24">
                                    Sell here
                                </TableHead>
                            )}
                            <TableHead className="min-w-44">
                                Live channels
                            </TableHead>
                            <TableHead className="w-32 text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {items.map((item) => {
                            const sellable = item.status !== "INACTIVE";
                            const listed = isBase
                                ? sellable
                                : isChannelListed(item.id);
                            const canPrice = isBase
                                ? Boolean(unitCostFor(item.id))
                                : true;

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
                                : `${summary.ways} unit${summary.ways === 1 ? "" : "s"}${listed ? "" : " · not sold on this channel"
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
        </div>
    );
}
