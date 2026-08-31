"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, LoaderCircle, Scale, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clampStockInput } from "@/lib/api/inventory";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
    ChannelStockAllocation,
    ChannelStockMode,
} from "@/lib/api/channel-stock";
import type { InventoryItem } from "@/lib/api/inventory";
import type { SalesChannel } from "@/lib/api/sales-channels";
import {
    ChannelMembershipProbe,
    mergeMembership,
    type ChannelMembership,
} from "@/components/menu/ChannelMembershipProbe";
import {
    useGetCurrentStockQuery,
    useSaveItemChannelStockMutation,
} from "@/services/inventoryApi";

/**
 * How a shelf gets divided.
 *
 * Four ways because shops divide stock for different reasons: an even hand
 * when no channel is favoured, a percentage when one reliably outsells the
 * rest, a flat number when the shop is holding a fixed window open on each
 * channel, and shared for undoing all of it.
 */
const methods = ["EVEN", "PERCENT", "FIXED", "SHARED"] as const;

type SplitMethod = (typeof methods)[number];

const methodLabels: Record<SplitMethod, string> = {
    EVEN: "Split evenly",
    PERCENT: "By percentage",
    FIXED: "Fixed amount each",
    SHARED: "Back to shared",
};

/** How many planned rows the preview shows before it says "and the rest". */
const previewLimit = 40;

const methodHints: Record<SplitMethod, string> = {
    EVEN: "Divides what is on hand equally between the channels you pick. Odd units go to the first.",
    PERCENT: "Gives each channel a share of what is on hand. Rounded down, so the total never exceeds the shelf.",
    FIXED: "Gives every channel the same number, until the shelf runs out.",
    SHARED: "Clears the split. Every channel sells from the full stock again.",
};

/** One thing an item counts, and what is on the shelf for it. */
type Target = { variantId: string | null; name: string; onHand: number };

/**
 * What one rule does to one shelf, spelled out.
 *
 * The rule is the same for every item; the answer is not, because the shelves
 * are not. "Split evenly" over four channels means five each on a shelf of
 * twenty and two-and-a-spare on a shelf of eleven — so the shop is shown the
 * numbers, per item and per option, before any of them are written.
 */
type PlannedRow = {
    key: string;
    variantId: string | null;
    itemName: string;
    optionName: string | null;
    onHand: number;
    /** Channel id -> what it gets. Channels with nothing are left out. */
    quantities: Record<string, number>;
    given: number;
};

/**
 * Splitting many items at once.
 *
 * The item form asks for a number per channel, which is the right question for
 * one item and an impossible one for eighty. Here the shop picks a rule
 * instead and the numbers are worked out per item from what is actually on its
 * shelf — the same allocation, arrived at by arithmetic rather than by typing.
 */
export function SplitStockDialog({
    open,
    onClose,
    inventoryItems,
    salesChannels,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    inventoryItems: InventoryItem[];
    salesChannels: SalesChannel[];
    onSuccess?: () => void;
}) {
    const { toast } = useToast();
    const stockQuery = useGetCurrentStockQuery(undefined, { skip: !open });
    const [saveSplit] = useSaveItemChannelStockMutation();

    const activeChannels = useMemo(
        () => salesChannels.filter((channel) => channel.isActive),
        [salesChannels],
    );

    const [method, setMethod] = useState<SplitMethod>("EVEN");
    const [search, setSearch] = useState("");
    const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
    const [checkedChannelIds, setCheckedChannelIds] = useState<Set<string>>(
        new Set(),
    );
    /** Channel id -> its share, as typed. Only read under "By percentage". */
    const [percentages, setPercentages] = useState<Record<string, string>>({});
    /** The number every channel gets, under "Fixed amount each". */
    const [fixed, setFixed] = useState("");
    const [published, setPublished] = useState<Record<string, ChannelMembership>>(
        {},
    );
    const [isSaving, setIsSaving] = useState(false);
    const [seeded, setSeeded] = useState(false);

    // Opening the form starts on every channel and no items: the channels are
    // the rule, the items are the choice.
    if (open && !seeded) {
        setSeeded(true);
        setCheckedChannelIds(new Set(activeChannels.map((channel) => channel.id)));
        setCheckedItemIds(new Set());
        setSearch("");
    }

    if (!open && seeded) {
        setSeeded(false);
    }

    const collectPublished = useCallback(
        (channelId: string, membership: ChannelMembership) => {
            setPublished((prev) => mergeMembership(prev, channelId, membership));
        },
        [],
    );

    /** Every balance the shop holds, keyed by the thing it is a balance of. */
    const onHandByTarget = useMemo(() => {
        const balances = new Map<string, number>();

        (stockQuery.data || []).forEach((summary) => {
            if (!summary.itemId) return;

            balances.set(
                `${summary.itemId}:${summary.variantId || ""}`,
                summary.quantityOnHand ?? 0,
            );
        });

        return balances;
    }, [stockQuery.data]);

    const targetsOf = useCallback(
        (item: InventoryItem): Target[] => {
            const variants = (item.variants || []).filter((variant) => variant.id);

            if (variants.length === 0) {
                return [
                    {
                        variantId: null,
                        name: item.name || "Unnamed item",
                        onHand: onHandByTarget.get(`${item.id}:`) ?? 0,
                    },
                ];
            }

            return variants.map((variant) => ({
                variantId: variant.id as string,
                name: variant.name || "Option",
                onHand:
                    onHandByTarget.get(`${item.id}:${variant.id as string}`) ?? 0,
            }));
        },
        [onHandByTarget],
    );

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return inventoryItems;

        return inventoryItems.filter(
            (item) =>
                item.name?.toLowerCase().includes(query) ||
                item.sku?.toLowerCase().includes(query) ||
                item.code?.toLowerCase().includes(query) ||
                item.barcode?.toLowerCase().includes(query),
        );
    }, [inventoryItems, search]);

    /**
     * The channels that can actually take a share of this item.
     *
     * A channel that does not sell the item is skipped rather than refused:
     * the shop picked a rule for a batch, and one unpublished item in it is
     * not a reason to stop. The backend rejects the pair anyway.
     */
    const channelsFor = useCallback(
        (itemId: string) =>
            activeChannels.filter(
                (channel) =>
                    checkedChannelIds.has(channel.id) &&
                    Boolean(published[channel.id]?.[itemId]),
            ),
        [activeChannels, checkedChannelIds, published],
    );

    /**
     * What one item's shelf becomes under the chosen rule.
     *
     * Whole units only — half a jar cannot be given to Telegram — and always
     * rounded down, so the arithmetic can never hand out more than is there.
     */
    const planFor = useCallback(
        (item: InventoryItem): PlannedRow[] => {
            const channels = channelsFor(item.id);

            if (method === "SHARED" || channels.length === 0) return [];

            return targetsOf(item).map((target) => {
                const onHand = Math.max(0, Math.floor(target.onHand));
                const quantities: Record<string, number> = {};

                if (onHand > 0 && method === "EVEN") {
                    const base = Math.floor(onHand / channels.length);
                    // The odd units go to the first channels rather than
                    // nowhere: rounding down alone would strand up to one unit
                    // per channel on every split.
                    let spare = onHand - base * channels.length;

                    channels.forEach((channel) => {
                        const quantity = base + (spare > 0 ? 1 : 0);
                        if (spare > 0) spare -= 1;
                        if (quantity > 0) quantities[channel.id] = quantity;
                    });
                }

                if (onHand > 0 && method === "PERCENT") {
                    channels.forEach((channel) => {
                        const share = Number(percentages[channel.id] || 0);
                        const quantity = Math.floor((onHand * share) / 100);

                        if (Number.isFinite(quantity) && quantity > 0) {
                            quantities[channel.id] = quantity;
                        }
                    });
                }

                if (onHand > 0 && method === "FIXED") {
                    // The same number each, until the shelf runs out. The last
                    // channel takes what is left rather than the full amount,
                    // which is the only honest answer when there is not enough.
                    let left = onHand;
                    const wanted = Math.max(0, Math.floor(Number(fixed || 0)));

                    channels.forEach((channel) => {
                        const quantity = Math.min(wanted, left);

                        if (quantity > 0) {
                            left -= quantity;
                            quantities[channel.id] = quantity;
                        }
                    });
                }

                const given = Object.values(quantities).reduce(
                    (total, quantity) => total + quantity,
                    0,
                );

                return {
                    key: `${item.id}:${target.variantId || ""}`,
                    variantId: target.variantId,
                    itemName: item.name || "Unnamed item",
                    optionName: target.variantId ? target.name : null,
                    onHand,
                    quantities,
                    given,
                };
            });
        },
        [channelsFor, fixed, method, percentages, targetsOf],
    );

    const allocationsFor = useCallback(
        (item: InventoryItem): ChannelStockAllocation[] =>
            planFor(item).flatMap((row) =>
                Object.entries(row.quantities).map(([salesChannelId, quantity]) => ({
                    salesChannelId,
                    variantId: row.variantId,
                    quantity,
                })),
            ),
        [planFor],
    );

    /**
     * Every line the rule would write, for the items that were picked.
     *
     * Capped for display: a shop splitting its whole catalogue wants to see
     * that the rule does the right thing on the first few, not to scroll two
     * hundred rows. The count below says how many there are in total.
     */
    const plannedRows = useMemo(() => {
        const rows: PlannedRow[] = [];

        inventoryItems.forEach((item) => {
            if (!checkedItemIds.has(item.id)) return;
            rows.push(...planFor(item));
        });

        return rows;
    }, [checkedItemIds, inventoryItems, planFor]);

    /** What the button is about to do, counted before it does it. */
    const preview = useMemo(() => {
        const items = inventoryItems.filter((item) => checkedItemIds.has(item.id));
        let allocated = 0;
        let skipped = 0;

        items.forEach((item) => {
            if (channelsFor(item.id).length === 0) {
                skipped += 1;
                return;
            }

            allocated += 1;
        });

        return { items: items.length, allocated, skipped };
    }, [channelsFor, checkedItemIds, inventoryItems]);

    /**
     * The columns the preview shows.
     *
     * Only the ticked channels: a column of dashes for a channel nobody chose
     * is a column of noise, and the table is already as wide as the shop's
     * channel list.
     */
    const previewChannels = useMemo(
        () => activeChannels.filter((channel) => checkedChannelIds.has(channel.id)),
        [activeChannels, checkedChannelIds],
    );

    const percentTotal = useMemo(
        () =>
            activeChannels
                .filter((channel) => checkedChannelIds.has(channel.id))
                .reduce(
                    (total, channel) =>
                        total + Number(percentages[channel.id] || 0),
                    0,
                ),
        [activeChannels, checkedChannelIds, percentages],
    );

    const toggleItem = (itemId: string) => {
        setCheckedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const toggleChannel = (channelId: string) => {
        setCheckedChannelIds((prev) => {
            const next = new Set(prev);
            if (next.has(channelId)) next.delete(channelId);
            else next.add(channelId);
            return next;
        });
    };

    const toggleAllFiltered = () => {
        const ids = filteredItems.map((item) => item.id);
        const allChecked = ids.every((id) => checkedItemIds.has(id));

        setCheckedItemIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const handleApply = async (event: React.FormEvent) => {
        event.preventDefault();

        const items = inventoryItems.filter((item) => checkedItemIds.has(item.id));

        if (items.length === 0) {
            toast({
                tone: "info",
                title: "Nothing selected",
                description: "Pick at least one item to split.",
            });
            return;
        }

        if (method !== "SHARED" && checkedChannelIds.size === 0) {
            toast({
                tone: "info",
                title: "No channels picked",
                description: "Choose the channels that should get a share.",
            });
            return;
        }

        if (method === "PERCENT" && percentTotal > 100) {
            toast({
                tone: "error",
                title: "Shares add up to more than the shelf",
                description: `Those percentages total ${percentTotal}%.`,
            });
            return;
        }

        setIsSaving(true);

        try {
            const mode: ChannelStockMode =
                method === "SHARED" ? "SHARED" : "ALLOCATED";

            // Settled rather than all: one item the backend refuses should not
            // throw away the splits that were already written.
            const results = await Promise.allSettled(
                items.map((item) =>
                    saveSplit({
                        itemId: item.id,
                        body: {
                            mode,
                            allocations: allocationsFor(item).map((row) => ({
                                salesChannelId: row.salesChannelId,
                                variantId: row.variantId ?? null,
                                quantity: row.quantity,
                            })),
                        },
                    }).unwrap(),
                ),
            );

            const failed = results.filter((result) => result.status === "rejected");

            if (failed.length === results.length) {
                const [first] = failed;

                toast({
                    tone: "error",
                    title: "Nothing was split",
                    description: getApiErrorMessage(
                        first && "reason" in first ? first.reason : undefined,
                        "The split could not be saved.",
                    ),
                });
                return;
            }

            toast({
                tone: failed.length ? "info" : "success",
                title:
                    method === "SHARED"
                        ? "Back to shared stock"
                        : "Stock split across channels",
                description: failed.length
                    ? `${results.length - failed.length} of ${results.length} items updated.`
                    : `${results.length} item${results.length === 1 ? "" : "s"} updated.`,
            });

            onSuccess?.();
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl rounded-2xl border-none bg-white dark:bg-[#181b24] p-6 shadow-2xl">
                <DialogHeader className="border-none pb-3">
                    <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
                        <Scale className="size-6 text-primary" /> Split stock
                        across channels
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        One shelf, divided by a rule. Each channel may sell up
                        to its share; what is left over is held back.
                    </DialogDescription>
                </DialogHeader>

                {/* What each channel already sells, so items it does not
                    stock are left out of the rule. */}
                {activeChannels.map((channel) => (
                    <ChannelMembershipProbe
                        key={channel.id}
                        channelId={channel.id}
                        channelCode={channel.code}
                        skip={!open}
                        onLoaded={collectPublished}
                    />
                ))}

                <form onSubmit={handleApply} className="space-y-4 pt-1">
                    <div className="space-y-2">
                        <label
                            htmlFor="split-method"
                            className="text-sm font-bold text-foreground"
                        >
                            Method
                        </label>
                        <Select
                            value={method}
                            items={methodLabels}
                            onValueChange={(value) =>
                                setMethod((value || "EVEN") as SplitMethod)
                            }
                        >
                            <SelectTrigger
                                id="split-method"
                                className="h-11 w-full rounded-xl"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {methods.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {methodLabels[value]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {methodHints[method]}
                        </p>
                    </div>

                    {method === "FIXED" && (
                        <div className="space-y-1.5">
                            <label
                                htmlFor="split-fixed"
                                className="text-sm font-bold text-foreground"
                            >
                                Units per channel
                            </label>
                            <Input
                                id="split-fixed"
                                inputMode="decimal"
                                className="h-11 w-32 rounded-xl"
                                placeholder="0"
                                value={fixed}
                                onChange={(event) =>
                                    setFixed(clampStockInput(event.target.value))
                                }
                            />
                        </div>
                    )}

                    {method !== "SHARED" && (
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm font-bold text-foreground">
                                    Channels
                                </span>
                                {method === "PERCENT" && (
                                    <span
                                        className={`text-xs font-bold ${
                                            percentTotal > 100
                                                ? "text-destructive"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {percentTotal}% allocated
                                    </span>
                                )}
                            </div>

                            {/* Chips on one line rather than a column: the
                                channel list is short and fixed, and a stacked
                                one pushed the items and the preview — the two
                                things worth reading — off the screen. */}
                            <div className="flex flex-wrap items-center gap-2">
                                {activeChannels.map((channel) => {
                                    const isChecked = checkedChannelIds.has(
                                        channel.id,
                                    );

                                    return (
                                        <div
                                            key={channel.id}
                                            className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${
                                                isChecked
                                                    ? "border-primary/40 bg-primary/10"
                                                    : "border-border bg-[#f5f5f5] dark:bg-muted/50"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleChannel(channel.id)
                                                }
                                                className="flex cursor-pointer items-center gap-2 text-left"
                                            >
                                                <span
                                                    className={`grid size-4.5 place-items-center rounded-md transition-colors ${
                                                        isChecked
                                                            ? "bg-primary text-primary-foreground"
                                                            : "border border-input bg-background"
                                                    }`}
                                                >
                                                    {isChecked && (
                                                        <Check className="size-3 stroke-3" />
                                                    )}
                                                </span>
                                                <span
                                                    className={`text-sm font-bold whitespace-nowrap ${
                                                        isChecked
                                                            ? "text-foreground"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {channel.name}
                                                </span>
                                            </button>

                                            {method === "PERCENT" &&
                                                isChecked && (
                                                    <span className="flex items-center gap-1">
                                                        <Input
                                                            inputMode="numeric"
                                                            aria-label={`${channel.name} share`}
                                                            className="h-7 w-14 px-2 text-right"
                                                            placeholder="0"
                                                            value={
                                                                percentages[
                                                                    channel.id
                                                                ] || ""
                                                            }
                                                            onChange={(event) =>
                                                                setPercentages(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [channel.id]:
                                                                            event.target.value.replace(
                                                                                /[^\d]/g,
                                                                                "",
                                                                            ),
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            %
                                                        </span>
                                                    </span>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">
                                Items
                            </span>
                            <button
                                type="button"
                                onClick={toggleAllFiltered}
                                className="cursor-pointer text-sm font-bold text-primary hover:underline"
                            >
                                {filteredItems.every((item) =>
                                    checkedItemIds.has(item.id),
                                ) && filteredItems.length > 0
                                    ? "Deselect all"
                                    : "Select all"}
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="h-11 rounded-xl pl-9"
                                placeholder="Search items by name, SKU or barcode..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>

                        <div className="max-h-44 overflow-y-auto rounded-xl bg-muted/20 p-1.5 sm:grid sm:grid-cols-2 sm:gap-x-2">
                            {stockQuery.isLoading ? (
                                <p className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                                    <LoaderCircle className="size-4 animate-spin text-primary" />
                                    Reading stock...
                                </p>
                            ) : filteredItems.length === 0 ? (
                                <p className="py-8 text-center text-xs text-muted-foreground">
                                    Nothing matches that search.
                                </p>
                            ) : (
                                filteredItems.map((item) => {
                                    const isChecked = checkedItemIds.has(item.id);
                                    const onHand = targetsOf(item).reduce(
                                        (total, target) => total + target.onHand,
                                        0,
                                    );

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleItem(item.id)}
                                            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-muted/40"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span
                                                    className={`grid size-5 place-items-center rounded-md transition-colors ${
                                                        isChecked
                                                            ? "bg-primary text-primary-foreground"
                                                            : "border border-input bg-background"
                                                    }`}
                                                >
                                                    {isChecked && (
                                                        <Check className="size-3.5 stroke-3" />
                                                    )}
                                                </span>
                                                <span className="truncate text-sm font-semibold text-foreground">
                                                    {item.name || "Unnamed item"}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {onHand} on hand
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* What the rule actually does, before it does it.
                        The rule is one sentence; its answer is a different
                        number for every shelf it lands on, and a shop cannot
                        agree to what it has not been shown. */}
                    {method !== "SHARED" && plannedRows.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm font-bold text-foreground">
                                    What each item gets
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {plannedRows.length} row
                                    {plannedRows.length === 1 ? "" : "s"}
                                </span>
                            </div>

                            <div className="max-h-64 overflow-auto rounded-xl border border-border">
                                <table className="w-full min-w-fit border-collapse text-sm">
                                    <thead className="sticky top-0 z-10 bg-card">
                                        <tr className="border-b border-border">
                                            <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">
                                                Item
                                            </th>
                                            {previewChannels.map((channel) => (
                                                <th
                                                    key={channel.id}
                                                    className="px-3 py-2 text-right text-xs font-bold text-foreground whitespace-nowrap"
                                                >
                                                    {channel.name}
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground whitespace-nowrap">
                                                On hand
                                            </th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-muted-foreground whitespace-nowrap">
                                                Held back
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plannedRows
                                            .slice(0, previewLimit)
                                            .map((row) => (
                                                <tr
                                                    key={row.key}
                                                    className="border-b border-border/50 last:border-0"
                                                >
                                                    <td className="max-w-56 px-3 py-2">
                                                        <span className="block truncate font-semibold text-foreground">
                                                            {row.itemName}
                                                        </span>
                                                        {row.optionName && (
                                                            <span className="block truncate text-xs text-muted-foreground">
                                                                {row.optionName}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {previewChannels.map((channel) => {
                                                        const quantity =
                                                            row.quantities[channel.id];

                                                        return (
                                                            <td
                                                                key={channel.id}
                                                                className={`px-3 py-2 text-right tabular-nums ${
                                                                    quantity
                                                                        ? "font-bold text-foreground"
                                                                        : "text-muted-foreground/60"
                                                                }`}
                                                            >
                                                                {quantity ?? "—"}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                                        {row.onHand}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                                        {row.onHand - row.given}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {plannedRows.length > previewLimit && (
                                <p className="text-xs text-muted-foreground">
                                    Showing the first {previewLimit} of{" "}
                                    {plannedRows.length}. The rule applies to
                                    all of them.
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col items-stretch gap-2 pt-1 sm:flex-row sm:items-center">
                        <p className="mr-auto text-xs text-muted-foreground">
                            {preview.items === 0
                                ? "No items picked yet."
                                : method === "SHARED"
                                  ? `${preview.items} item${preview.items === 1 ? "" : "s"} back to shared stock.`
                                  : `${preview.allocated} of ${preview.items} item${preview.items === 1 ? "" : "s"} will be split` +
                                    (preview.skipped
                                        ? ` · ${preview.skipped} not on those channels`
                                        : "")}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="rounded-xl font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="gap-2 rounded-xl font-semibold"
                        >
                            {isSaving && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {method === "SHARED" ? "Clear split" : "Apply split"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
