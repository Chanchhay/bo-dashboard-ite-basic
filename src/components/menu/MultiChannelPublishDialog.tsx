"use client";

import { useCallback, useMemo, useState } from "react";
import {
    Check,
    CheckSquare,
    ChevronDown,
    LoaderCircle,
    Search,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/lib/api/inventory";
import type { SalesChannel } from "@/lib/api/sales-channels";
import {
    ChannelMembershipProbe,
    mergeMembership,
    type ChannelMembership,
} from "@/components/menu/ChannelMembershipProbe";
import { ChannelStockAllocator } from "@/components/menu/ChannelStockAllocator";
import { useChannelStockDraft } from "@/components/menu/useChannelStockDraft";
import {
    useCreateItemChannelMutation,
    useDeleteItemChannelMutation,
    useGetItemChannelsByItemQuery,
} from "@/services/salesChannelApi";

interface MultiChannelPublishDialogProps {
    open: boolean;
    onClose: () => void;
    inventoryItems: InventoryItem[];
    salesChannels: SalesChannel[];
    initialItemId?: string;
    onSuccess?: () => void;
}

export function MultiChannelPublishDialog({
    open,
    onClose,
    inventoryItems,
    salesChannels,
    initialItemId,
    onSuccess,
}: MultiChannelPublishDialogProps) {
    const { toast } = useToast();

    // Active channels mapping
    const activeSalesChannels = useMemo(
        () => salesChannels.filter((c) => c.isActive),
        [salesChannels]
    );

    // Extract all unique category names from inventoryItems
    const availableCategories = useMemo(() => {
        const categoriesSet = new Set<string>();
        inventoryItems.forEach((item) => {
            const catName = item.itemGroup?.name?.trim();
            if (catName) {
                categoriesSet.add(catName);
            }
        });
        return Array.from(categoriesSet).sort();
    }, [inventoryItems]);

    // Single item state (when initialItemId is present)
    const [singleItemId, setSingleItemId] = useState<string>(initialItemId || "");

    // Multi-item batch state (when initialItemId is absent)
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
    const [productSearchQuery, setProductSearchQuery] = useState<string>("");
    const [checkedProductIds, setCheckedProductIds] = useState<Set<string>>(new Set());
    const [checkedChannelIds, setCheckedChannelIds] = useState<Set<string>>(
        new Set(activeSalesChannels.map((c) => c.id))
    );
    const [isSaving, setIsSaving] = useState(false);
    /**
     * Which way the batch runs.
     *
     * Publishing and unpublishing are kept apart rather than diffed from the
     * ticks, because the item list is filtered: a shop that narrowed to Drinks
     * and saved would otherwise have every unshown item read as "not wanted"
     * and pulled off the channel. An explicit direction can only ever act on
     * what was ticked.
     */
    const [mode, setMode] = useState<"publish" | "unpublish">("publish");
    /** Channel id -> the items it already sells, so the batch can skip them. */
    const [published, setPublished] = useState<Record<string, ChannelMembership>>({});
    /** The channel whose whole listing is about to be cleared, once confirmed. */
    const [purgeChannelId, setPurgeChannelId] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const collectPublished = useCallback(
        (channelId: string, membership: ChannelMembership) => {
            setPublished((prev) => mergeMembership(prev, channelId, membership));
        },
        [],
    );

    // Which opening of the form has already been seeded.
    const [seededFor, setSeededFor] = useState<string | null>(null);

    // The row that opened this decides the item, so the query below has
    // something to ask about on the very first render.
    if (open && initialItemId && singleItemId !== initialItemId) {
        setSingleItemId(initialItemId);
    }

    // Single item object
    const singleItem = useMemo(
        () => inventoryItems.find((i) => i.id === singleItemId) || null,
        [inventoryItems, singleItemId]
    );

    // Fetch existing item-channel links for single item mode
    const {
        data: existingItemChannels = [],
        isLoading: isSingleItemLoading,
        isSuccess: isSingleItemLoaded,
    } = useGetItemChannelsByItemQuery(singleItemId, {
        skip: !open || !singleItemId,
    });

    const [createItemChannel] = useCreateItemChannelMutation();
    const [deleteItemChannel] = useDeleteItemChannelMutation();

    /**
     * How much of this item's stock each channel may sell.
     *
     * Only the single-item form edits it: a share is a number per channel per
     * option, and a batch that published fifty items could not ask for one
     * without becoming a spreadsheet.
     */
    const stockDraft = useChannelStockDraft({
        item: singleItem,
        open: open && Boolean(initialItemId),
    });

    // Existing mapping for single item: salesChannelId -> itemChannelId
    const existingChannelMap = useMemo(() => {
        const map = new Map<string, string>();
        existingItemChannels.forEach((ic) => {
            map.set(ic.salesChannelId, ic.id);
        });
        return map;
    }, [existingItemChannels]);

    /**
     * What the form starts on, filled in once per opening.
     *
     * Seeded during render rather than from an effect, and keyed on the
     * opening rather than on the data: a refetch handing back a fresh array is
     * not the user reopening the form, and re-seeding on one would throw away
     * everything they had ticked. Single mode waits for its read to land, or
     * it would seed an item's channels from an empty list.
     */
    const seedKey = !open
        ? null
        : initialItemId
          ? isSingleItemLoaded && singleItemId === initialItemId
              ? `single:${initialItemId}`
              : null
          : "batch";

    if (seedKey && seedKey !== seededFor) {
        setSeededFor(seedKey);

        if (initialItemId) {
            const live = new Set<string>();

            existingItemChannels.forEach((ic) => {
                if (ic.enabled !== false) live.add(ic.salesChannelId);
            });

            setCheckedChannelIds(live);
        } else {
            setSingleItemId("");
            setSelectedCategory("ALL");
            setProductSearchQuery("");
            setMode("publish");
            setCheckedProductIds(new Set(inventoryItems.map((i) => i.id)));
            setCheckedChannelIds(new Set(activeSalesChannels.map((c) => c.id)));
        }
    }

    // Closing lets the next opening seed itself again.
    if (!open && seededFor !== null) {
        setSeededFor(null);
    }

    // The items on offer, once the category and search have narrowed them
    const filteredProducts = useMemo(() => {
        let base = inventoryItems;

        if (selectedCategory !== "ALL") {
            base = base.filter(
                (item) => item.itemGroup?.name?.trim() === selectedCategory
            );
        }

        const q = productSearchQuery.trim().toLowerCase();
        if (!q) return base;

        return base.filter(
            (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.barcode?.toLowerCase().includes(q) ||
                item.code?.toLowerCase().includes(q)
        );
    }, [inventoryItems, selectedCategory, productSearchQuery]);

    /**
     * The links that do not exist yet — the actual work of a batch publish.
     *
     * Counted up front so the button can say how many items it will touch, and
     * so a selection that changes nothing can say so rather than appear to run.
     */
    const newPairs = useMemo(() => {
        if (initialItemId) return [];

        const pairs: { itemId: string; channelId: string }[] = [];

        for (const channelId of checkedChannelIds) {
            const already = published[channelId] || {};

            for (const itemId of checkedProductIds) {
                if (!already[itemId]) pairs.push({ itemId, channelId });
            }
        }

        return pairs;
    }, [initialItemId, checkedChannelIds, checkedProductIds, published]);

    /**
     * The links to take away — the mirror of the above.
     *
     * Only ticked items on ticked channels, and only ones that are actually
     * there: an item that was never on the channel is not an error to report,
     * it is simply nothing to do.
     */
    const removablePairs = useMemo(() => {
        if (initialItemId) return [];

        const pairs: { itemId: string; channelId: string; linkId: string }[] = [];

        for (const channelId of checkedChannelIds) {
            const already = published[channelId] || {};

            for (const itemId of checkedProductIds) {
                const linkId = already[itemId];
                if (linkId) pairs.push({ itemId, channelId, linkId });
            }
        }

        return pairs;
    }, [initialItemId, checkedChannelIds, checkedProductIds, published]);

    /** What the footer button is about to do, in the direction chosen. */
    const pendingPairs = mode === "publish" ? newPairs : removablePairs;

    /**
     * How much of the catalogue each channel currently sells.
     *
     * The old chip read "Active" whether the channel sold everything or
     * nothing, because it was only echoing its own tick back. A count is the
     * one thing a shop actually wants to know before it changes anything.
     */
    const publishedCounts = useMemo(() => {
        const counts: Record<string, number> = {};

        activeSalesChannels.forEach((channel) => {
            counts[channel.id] = Object.keys(published[channel.id] || {}).length;
        });

        return counts;
    }, [activeSalesChannels, published]);

    const purgeChannel = useMemo(
        () => activeSalesChannels.find((c) => c.id === purgeChannelId) || null,
        [activeSalesChannels, purgeChannelId],
    );

    // Toggle one item
    const toggleProductCheck = (productId: string) => {
        setCheckedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    // Check / uncheck every item the filter left showing
    const toggleSelectAllFilteredProducts = () => {
        const filteredIds = filteredProducts.map((p) => p.id);
        const allFilteredChecked = filteredIds.every((id) => checkedProductIds.has(id));

        setCheckedProductIds((prev) => {
            const next = new Set(prev);
            if (allFilteredChecked) {
                filteredIds.forEach((id) => next.delete(id));
            } else {
                filteredIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    // Toggle channel checkbox
    const toggleChannel = (channelId: string) => {
        setCheckedChannelIds((prev) => {
            const next = new Set(prev);
            if (next.has(channelId)) {
                next.delete(channelId);
            } else {
                next.add(channelId);
            }
            return next;
        });
    };

    // Select / Deselect All Channels
    const toggleSelectAllChannels = () => {
        if (checkedChannelIds.size === activeSalesChannels.length) {
            setCheckedChannelIds(new Set());
        } else {
            setCheckedChannelIds(new Set(activeSalesChannels.map((c) => c.id)));
        }
    };

    // Submit Handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            if (initialItemId && singleItem) {
                // One item, opened from its row
                if (stockDraft.overAllocated(checkedChannelIds)) {
                    toast({
                        tone: "error",
                        title: "More allocated than on hand",
                        description:
                            "Lower a channel's share so the total fits the stock you have.",
                    });
                    setIsSaving(false);
                    return;
                }

                const promises: Promise<unknown>[] = [];

                activeSalesChannels.forEach((channel) => {
                    const isChecked = checkedChannelIds.has(channel.id);
                    const existingLinkId = existingChannelMap.get(channel.id);

                    if (isChecked && !existingLinkId) {
                        promises.push(
                            createItemChannel({
                                itemId: singleItemId,
                                salesChannelId: channel.id,
                            }).unwrap()
                        );
                    } else if (!isChecked && existingLinkId) {
                        promises.push(deleteItemChannel(existingLinkId).unwrap());
                    }
                });

                await Promise.all(promises);

                // After the links, never before: a share is a share of what a
                // channel sells, so it is only meaningful once the channel is
                // actually selling the item.
                await stockDraft.save(checkedChannelIds);

                toast({
                    tone: "success",
                    title: "Channels Saved",
                    description: `Updated sales channels for ${singleItem.name || "item"}.`,
                });
            } else {
                // Many items onto many channels at once.
                if (checkedProductIds.size === 0 || checkedChannelIds.size === 0) {
                    toast({
                        tone: "info",
                        title: "Nothing selected",
                        description: "Pick at least one item and one sales channel.",
                    });
                    setIsSaving(false);
                    return;
                }

                // An item already on a channel is left alone rather than sent
                // again: the pair is unique on the backend, so re-sending it
                // would fail the whole batch over items that were fine. The
                // same reading backwards — an item that was never on the
                // channel is nothing to remove.
                if (pendingPairs.length === 0) {
                    toast({
                        tone: "info",
                        title:
                            mode === "publish"
                                ? "Already published"
                                : "Nothing to unpublish",
                        description:
                            mode === "publish"
                                ? "Every item you picked already sells on those channels."
                                : "None of the items you picked are on those channels.",
                    });
                    setIsSaving(false);
                    return;
                }

                // Settled rather than all: one rejected pair should not throw
                // away the rest, which have already been written.
                const results = await Promise.allSettled(
                    mode === "publish"
                        ? newPairs.map((pair) =>
                              createItemChannel({
                                  itemId: pair.itemId,
                                  salesChannelId: pair.channelId,
                              }).unwrap()
                          )
                        : removablePairs.map((pair) =>
                              deleteItemChannel(pair.linkId).unwrap()
                          )
                );

                const failed = results.filter((r) => r.status === "rejected").length;
                const done = results.length - failed;
                const channelCount = checkedChannelIds.size;
                const channelWord = `sales channel${channelCount === 1 ? "" : "s"}`;

                toast({
                    tone: failed ? "error" : "success",
                    title: failed
                        ? `${done} of ${results.length} ${mode === "publish" ? "published" : "unpublished"}`
                        : mode === "publish"
                          ? "Items published"
                          : "Items unpublished",
                    description: failed
                        ? `${failed} could not be ${mode === "publish" ? "added" : "removed"}. Try those again.`
                        : mode === "publish"
                          ? `Added to ${channelCount} ${channelWord}.`
                          : `Taken off ${channelCount} ${channelWord}. Their channel prices are kept, so republishing restores them.`,
                });
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            toast({
                tone: "error",
                title: "Failed to save channels",
                description: getApiErrorMessage(err, "Please try again."),
            });
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Take a whole channel down for this shop.
     *
     * `sales_channels` is shared across every business on the platform, so its
     * own `isActive` flag is not this shop's to switch — turning Telegram off
     * there would turn it off for everybody. What a shop can decide is what it
     * offers, so "deactivate" here means the channel is left selling nothing:
     * the storefront and the bot then have no menu to show for it.
     */
    const handleUnpublishChannel = async () => {
        if (!purgeChannelId) return;

        const links = Object.values(published[purgeChannelId] || {});
        const name = purgeChannel?.name || "channel";

        setIsSaving(true);

        try {
            const results = await Promise.allSettled(
                links.map((linkId) => deleteItemChannel(linkId).unwrap())
            );

            const failed = results.filter((r) => r.status === "rejected").length;

            toast({
                tone: failed ? "error" : "success",
                title: failed
                    ? `${results.length - failed} of ${results.length} removed`
                    : `${name} deactivated`,
                description: failed
                    ? `${failed} item${failed === 1 ? "" : "s"} could not be removed. Try again.`
                    : `${name} now sells nothing. Channel prices are kept, so republishing restores them.`,
            });

            onSuccess?.();
        } catch (err) {
            toast({
                tone: "error",
                title: "Failed to deactivate channel",
                description: getApiErrorMessage(err, "Please try again."),
            });
        } finally {
            setIsSaving(false);
            setConfirmOpen(false);
            setPurgeChannelId(null);
        }
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className={`rounded-2xl p-6 bg-white dark:bg-[#181b24] border-none shadow-2xl ${
                    !initialItemId
                        ? "max-w-3xl"
                        : // The allocation grid needs room to lay a column out
                          // per channel; the plain channel checklist does not.
                          stockDraft.mode === "ALLOCATED"
                          ? "max-w-3xl"
                          : "max-w-md"
                }`}
            >
                {/* Header */}
                <DialogHeader className="pb-3 border-none">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground">
                        <CheckSquare className="h-6 w-6 text-primary" /> Manage Sales Channels
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {initialItemId
                            ? `Select allowed sales channels for ${singleItem?.name || "this item"}.`
                            : mode === "publish"
                              ? "Pick the items you sell, then the channels that sell them."
                              : "Pick the items to take off sale, then the channels to take them off."}
                    </DialogDescription>
                </DialogHeader>

                {/* What each channel already sells, so the batch skips it. */}
                {activeSalesChannels.map((channel) => (
                    <ChannelMembershipProbe
                        key={channel.id}
                        channelId={channel.id}
                        channelCode={channel.code}
                        skip={!open || Boolean(initialItemId)}
                        onLoaded={collectPublished}
                    />
                ))}

                <form onSubmit={handleSubmit} className="space-y-5 pt-1">
                    {/* MODE 1: Single Row Item Mode */}
                    {initialItemId ? (
                        <div className="space-y-4">
                            {/* Single Item Card without Image, Stroke, or Fill */}
                            {singleItem && (
                                <div className="py-2 px-1 bg-transparent">
                                    <p className="text-sm font-bold text-foreground truncate">
                                        {singleItem.name || "Unnamed Item"}
                                    </p>
                                    {(singleItem.itemGroup?.name) && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {singleItem.itemGroup?.name}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Single Item Channels Checklist */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-foreground">Allowed Sales Channels</span>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllChannels}
                                        className="text-sm font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        {checkedChannelIds.size === activeSalesChannels.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>

                                {isSingleItemLoading ? (
                                    <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                        <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> Loading channels...
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {activeSalesChannels.map((channel) => {
                                            const isChecked = checkedChannelIds.has(channel.id);

                                            return (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => toggleChannel(channel.id)}
                                                    className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all bg-transparent hover:bg-muted/30 ${
                                                        isChecked
                                                            ? "text-foreground font-bold"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`grid h-5 w-5 place-items-center rounded-md transition-colors ${
                                                                isChecked
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "border border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">{channel.name}</span>
                                                    </div>

                                                    <span
                                                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                                            isChecked ? "text-primary" : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {isChecked ? "Active" : "Disabled"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* How much of the one shelf each channel may sell. */}
                            {!isSingleItemLoading && (
                                <ChannelStockAllocator
                                    draft={stockDraft}
                                    channels={activeSalesChannels}
                                    checkedChannelIds={checkedChannelIds}
                                />
                            )}
                        </div>
                    ) : (
                        /* MODE 2: Ultra-Clean Spacious 2-Column Batch Mode */
                        <div className="space-y-4">
                        {/* Which way the batch runs. */}
                        <div className="inline-flex rounded-xl bg-[#f5f5f5] dark:bg-muted/50 p-1">
                            {(["publish", "unpublish"] as const).map((value) => {
                                const isActive = mode === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            if (value === mode) return;
                                            setMode(value);
                                            setCheckedProductIds(new Set());
                                        }}
                                        className={cn(
                                            "rounded-lg px-4 py-2 text-sm font-bold transition-all cursor-pointer",
                                            isActive
                                                ? value === "publish"
                                                    ? "bg-white dark:bg-card text-primary shadow-xs"
                                                    : "bg-white dark:bg-card text-danger shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {value === "publish" ? "Publish" : "Unpublish"}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* LEFT COLUMN: item selection (7 cols) */}
                            <div className="md:col-span-7 space-y-3">
                                {/* Combined Search & Category Filter Header */}
                                <div className="flex items-center gap-2.5">
                                    {availableCategories.length > 0 && (
                                        <div className="relative min-w-[160px] max-w-[190px]">
                                            <button
                                                type="button"
                                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                                className="w-full h-11 px-3.5 flex items-center justify-between gap-1.5 text-sm font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                <span className="truncate">
                                                    {selectedCategory === "ALL" ? "All Categories" : selectedCategory}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {isCategoryOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setIsCategoryOpen(false)}
                                                    />
                                                    <div className="absolute left-0 top-12 z-50 min-w-[200px] max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl space-y-0.5 animate-in fade-in-50 zoom-in-95">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCategory("ALL");
                                                                setIsCategoryOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                                                                selectedCategory === "ALL"
                                                                    ? "bg-primary/10 text-primary font-bold"
                                                                    : "hover:bg-muted text-foreground"
                                                            }`}
                                                        >
                                                            <span>All Categories</span>
                                                            {selectedCategory === "ALL" && <Check className="h-4 w-4 text-primary stroke-[3]" />}
                                                        </button>

                                                        {availableCategories.map((cat) => {
                                                            const isSelected = selectedCategory === cat;
                                                            return (
                                                                <button
                                                                    key={cat}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedCategory(cat);
                                                                        setIsCategoryOpen(false);
                                                                    }}
                                                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                                                                        isSelected
                                                                            ? "bg-primary/10 text-primary font-bold"
                                                                            : "hover:bg-muted text-foreground"
                                                                    }`}
                                                                >
                                                                    <span className="truncate">{cat}</span>
                                                                    {isSelected && <Check className="h-4 w-4 text-primary stroke-[3]" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search items..."
                                            value={productSearchQuery}
                                            onChange={(e) => setProductSearchQuery(e.target.value)}
                                            className="h-11 pl-10 pr-9 text-sm font-semibold rounded-xl border border-border bg-card text-foreground"
                                        />
                                        {productSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setProductSearchQuery("")}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Item list header */}
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-sm font-bold text-foreground">Select items</span>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllFilteredProducts}
                                        className="text-sm font-bold text-primary hover:underline cursor-pointer"
                                    >
                                        Select all shown
                                    </button>
                                </div>

                                {/* Item list container */}
                                <div className="h-72 overflow-y-auto rounded-2xl bg-transparent p-1 space-y-1 border-none">
                                    {filteredProducts.length === 0 ? (
                                        <div className="py-16 text-center text-xs text-muted-foreground">
                                            No items match that filter.
                                        </div>
                                    ) : (
                                        filteredProducts.map((item) => {
                                            const isChecked = checkedProductIds.has(item.id);

                                            // Where it sells now, so the choice
                                            // is made against what is true and
                                            // not against a memory of it.
                                            const liveOn = activeSalesChannels.filter(
                                                (channel) =>
                                                    Boolean(published[channel.id]?.[item.id]),
                                            );

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => toggleProductCheck(item.id)}
                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all bg-transparent hover:bg-muted/30 ${
                                                        isChecked
                                                            ? "text-foreground font-bold"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className={`grid h-5 w-5 place-items-center rounded-md shrink-0 transition-colors ${
                                                                isChecked
                                                                    ? mode === "publish"
                                                                        ? "bg-primary text-primary-foreground"
                                                                        : "bg-brand-red text-white"
                                                                    : "border border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate font-bold text-foreground text-sm">{item.name || "Unnamed item"}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {liveOn.length
                                                                    ? `On ${liveOn.map((c) => c.name).join(", ")}`
                                                                    : item.itemGroup?.name || "Not on any channel"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Target Sales Channels Selection (5 cols) */}
                            <div className="md:col-span-5 space-y-3 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-sm font-bold text-foreground">Target Channels</span>
                                        <button
                                            type="button"
                                            onClick={toggleSelectAllChannels}
                                            className="text-sm font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            {checkedChannelIds.size === activeSalesChannels.length ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        {activeSalesChannels.map((channel) => {
                                            const isChecked = checkedChannelIds.has(channel.id);
                                            const liveCount = publishedCounts[channel.id] ?? 0;

                                            return (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => toggleChannel(channel.id)}
                                                    className={`flex items-center justify-between gap-2 p-3 rounded-xl cursor-pointer transition-all bg-transparent hover:bg-muted/30 ${
                                                        isChecked
                                                            ? "text-foreground font-bold"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className={`grid h-5 w-5 place-items-center rounded-md shrink-0 transition-colors ${
                                                                isChecked
                                                                    ? mode === "publish"
                                                                        ? "bg-primary text-primary-foreground"
                                                                        : "bg-brand-red text-white"
                                                                    : "border border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold truncate text-foreground">{channel.name}</p>
                                                            {/* What it sells now, not an echo of the tick. */}
                                                            <p
                                                                className={`text-xs truncate ${
                                                                    liveCount
                                                                        ? "text-muted-foreground"
                                                                        : "text-danger"
                                                                }`}
                                                            >
                                                                {liveCount
                                                                    ? `Selling ${liveCount} item${liveCount === 1 ? "" : "s"}`
                                                                    : "Selling nothing"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {liveCount > 0 && (
                                                        <button
                                                            type="button"
                                                            title={`Take every item off ${channel.name}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPurgeChannelId(channel.id);
                                                                setConfirmOpen(true);
                                                            }}
                                                            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <p className="px-1 text-xs leading-5 text-muted-foreground">
                                        Deactivating leaves a channel selling nothing, so its
                                        storefront and bot show no menu. Channel prices are kept
                                        either way — republishing restores them.
                                    </p>
                                </div>
                            </div>
                        </div>
                        </div>
                    )}

                    {/* Modal Footer */}
                    <DialogFooter className="pt-4 border-none flex items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl border-none bg-muted hover:bg-muted/80 font-bold text-sm h-11 px-5"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSaving ||
                                (initialItemId
                                    ? isSingleItemLoading
                                    : pendingPairs.length === 0)
                            }
                            className={`rounded-xl text-white font-bold text-sm h-11 px-6 shadow-sm cursor-pointer ${
                                !initialItemId && mode === "unpublish"
                                    ? "bg-brand-red hover:bg-brand-red/90"
                                    : "bg-primary hover:bg-primary/90"
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <LoaderCircle className="h-3.5 w-3.5 mr-1.5 animate-spin" />{" "}
                                    {mode === "publish" ? "Publishing..." : "Unpublishing..."}
                                </>
                            ) : initialItemId ? (
                                "Save Changes"
                            ) : mode === "unpublish" ? (
                                pendingPairs.length ? (
                                    `Unpublish ${pendingPairs.length} link${pendingPairs.length === 1 ? "" : "s"}`
                                ) : (
                                    "Nothing to unpublish"
                                )
                            ) : pendingPairs.length ? (
                                `Publish ${pendingPairs.length} link${pendingPairs.length === 1 ? "" : "s"}`
                            ) : (
                                "Already published"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

            <DestructiveConfirmDialog
                open={confirmOpen}
                title={`Deactivate ${purgeChannel?.name || "channel"}?`}
                description={`Every one of the ${purgeChannelId ? publishedCounts[purgeChannelId] ?? 0 : 0} items on ${purgeChannel?.name || "this channel"} comes off sale there. Its channel prices are kept, so publishing them again restores what you set.`}
                confirmLabel="Deactivate channel"
                pendingLabel="Deactivating…"
                isPending={isSaving}
                onOpenChange={(next) => {
                    setConfirmOpen(next);
                    if (!next) setPurgeChannelId(null);
                }}
                onConfirm={handleUnpublishChannel}
            />
        </>
    );
}
