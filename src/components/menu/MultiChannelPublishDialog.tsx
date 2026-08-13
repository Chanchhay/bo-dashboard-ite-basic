"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { InventoryItem } from "@/lib/api/inventory";
import type { SalesChannel } from "@/lib/api/sales-channels";
import {
    useCreateItemChannelMutation,
    useDeleteItemChannelMutation,
    useGetChannelItemsQuery,
    useGetItemChannelsByItemQuery,
} from "@/services/salesChannelApi";

/**
 * What one channel already sells, reported up.
 *
 * An item and a channel can only be linked once — the backend has a unique
 * constraint on the pair — so publishing a batch that includes anything already
 * published would fail the whole batch. Reading each channel's items first is
 * what lets the batch skip those pairs instead of choking on them.
 *
 * One component per channel because a hook cannot be called in a loop, and the
 * reads are cached, so this costs one request per channel while the form is open.
 */
function ChannelMembershipProbe({
    channelId,
    channelCode,
    skip,
    onLoaded,
}: {
    channelId: string;
    channelCode: string;
    skip: boolean;
    onLoaded: (channelId: string, itemIds: string[]) => void;
}) {
    const { data } = useGetChannelItemsQuery(channelCode, { skip });

    useEffect(() => {
        if (!data) return;

        onLoaded(
            channelId,
            data.map((entry) => entry.item?.id).filter(Boolean) as string[],
        );
    }, [channelId, data, onLoaded]);

    return null;
}

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
    /** Channel id -> the items it already sells, so the batch can skip them. */
    const [published, setPublished] = useState<Record<string, string[]>>({});

    const collectPublished = useCallback((channelId: string, itemIds: string[]) => {
        setPublished((prev) => {
            const previous = prev[channelId];

            // Cached reads re-report the same ids on every render pass, and a
            // fresh array each time would never settle.
            if (
                previous &&
                previous.length === itemIds.length &&
                previous.every((id, index) => id === itemIds[index])
            ) {
                return prev;
            }

            return { ...prev, [channelId]: itemIds };
        });
    }, []);

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
            const already = new Set(published[channelId] || []);

            for (const itemId of checkedProductIds) {
                if (!already.has(itemId)) pairs.push({ itemId, channelId });
            }
        }

        return pairs;
    }, [initialItemId, checkedChannelIds, checkedProductIds, published]);

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
                // would fail the whole batch over items that were fine.
                const pending = newPairs;

                if (pending.length === 0) {
                    toast({
                        tone: "info",
                        title: "Already published",
                        description:
                            "Every item you picked already sells on those channels.",
                    });
                    setIsSaving(false);
                    return;
                }

                // Settled rather than all: one rejected pair should not throw
                // away the rest, which have already been written.
                const results = await Promise.allSettled(
                    pending.map((pair) =>
                        createItemChannel({
                            itemId: pair.itemId,
                            salesChannelId: pair.channelId,
                        }).unwrap()
                    )
                );

                const failed = results.filter((r) => r.status === "rejected").length;
                const added = results.length - failed;

                toast({
                    tone: failed ? "error" : "success",
                    title: failed
                        ? `${added} of ${results.length} published`
                        : "Items published",
                    description: failed
                        ? `${failed} could not be added. Try those again.`
                        : `Added to ${checkedChannelIds.size} sales channel${checkedChannelIds.size === 1 ? "" : "s"}.`,
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

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className={`rounded-2xl p-6 bg-background transition-all border-none shadow-2xl ${
                    initialItemId ? "max-w-md" : "max-w-3xl"
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
                            : "Pick the items you sell, then the channels that sell them."}
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
                        </div>
                    ) : (
                        /* MODE 2: Ultra-Clean Spacious 2-Column Batch Mode */
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
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "border border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate font-bold text-foreground text-sm">{item.name || "Unnamed item"}</p>
                                                            {(item.itemGroup?.name) && (
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {item.itemGroup?.name}
                                                                </p>
                                                            )}
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

                                            return (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => toggleChannel(channel.id)}
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
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "border border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>
                                                        <span className="text-sm font-bold truncate text-foreground">{channel.name}</span>
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
                                    : newPairs.length === 0)
                            }
                            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm h-11 px-6 shadow-sm cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <LoaderCircle className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Publishing...
                                </>
                            ) : initialItemId ? (
                                "Save Changes"
                            ) : newPairs.length ? (
                                `Publish ${newPairs.length} link${newPairs.length === 1 ? "" : "s"}`
                            ) : (
                                "Already published"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
