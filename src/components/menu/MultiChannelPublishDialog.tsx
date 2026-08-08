"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Check,
    CheckSquare,
    ChevronDown,
    Globe,
    LoaderCircle,
    MessageSquare,
    Package,
    Search,
    Send,
    Square,
    Store,
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
import { useMoney } from "@/hooks/useMoney";
import { getApiErrorMessage } from "@/lib/api-error";
import type { InventoryItem } from "@/lib/api/inventory";
import type { SalesChannel } from "@/lib/api/sales-channels";
import {
    useCreateItemChannelMutation,
    useDeleteItemChannelMutation,
    useGetItemChannelsByItemQuery,
} from "@/services/salesChannelApi";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
    POS: Store,
    TELEGRAM: Send,
    MESSENGER: MessageSquare,
    ONLINE: Globe,
    WEB: Globe,
};

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
    const { format } = useMoney();
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

    // Reset or initialize state when open changes
    useEffect(() => {
        if (open) {
            if (initialItemId) {
                setSingleItemId(initialItemId);
            } else {
                setSingleItemId("");
                setSelectedCategory("ALL");
                setProductSearchQuery("");
                setCheckedProductIds(new Set(inventoryItems.map((i) => i.id)));
                setCheckedChannelIds(new Set(activeSalesChannels.map((c) => c.id)));
            }
        }
    }, [open, initialItemId, inventoryItems, activeSalesChannels]);

    // Single item object
    const singleItem = useMemo(
        () => inventoryItems.find((i) => i.id === singleItemId) || null,
        [inventoryItems, singleItemId]
    );

    // Fetch existing item-channel links for single item mode
    const {
        data: existingItemChannels = [],
        isLoading: isSingleItemLoading,
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

    // Initialize checked channel IDs in single item mode
    useEffect(() => {
        if (open && initialItemId && !isSingleItemLoading) {
            const initialChecked = new Set<string>();
            existingItemChannels.forEach((ic) => {
                if (ic.enabled !== false) {
                    initialChecked.add(ic.salesChannelId);
                }
            });
            setCheckedChannelIds(initialChecked);
        }
    }, [open, initialItemId, existingItemChannels, isSingleItemLoading]);

    // Filtered products list for multi-select batch mode
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

    // Toggle individual product checkbox
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

    // Check / Uncheck all products in current category / search filter
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
                // Single product mode for row button
                const promises: Promise<any>[] = [];

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
                // Multi-product category batch mode
                if (checkedProductIds.size === 0 || checkedChannelIds.size === 0) {
                    toast({
                        tone: "info",
                        title: "Selection Required",
                        description: "Please select at least one product and one sales channel.",
                    });
                    setIsSaving(false);
                    return;
                }

                const promises: Promise<any>[] = [];
                checkedProductIds.forEach((itemId) => {
                    checkedChannelIds.forEach((channelId) => {
                        promises.push(
                            createItemChannel({
                                itemId,
                                salesChannelId: channelId,
                            }).unwrap()
                        );
                    });
                });

                await Promise.all(promises);

                toast({
                    tone: "success",
                    title: "Products Added to Channels",
                    description: `Published products to selected sales channels successfully.`,
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
                className={`rounded-2xl p-6 bg-background transition-all border border-border shadow-xl ${
                    initialItemId ? "max-w-md" : "max-w-3xl"
                }`}
            >
                {/* Header */}
                <DialogHeader className="pb-3 border-b border-border/60">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <CheckSquare className="h-5 w-5 text-primary" /> Manage Sales Channels
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        {initialItemId
                            ? `Select allowed sales channels for ${singleItem?.name || "this item"}.`
                            : "Choose products from Overview catalog and assign them to sales channels."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-1">
                    {/* MODE 1: Single Row Item Mode */}
                    {initialItemId ? (
                        <div className="space-y-4">
                            {/* Single Item Card */}
                            {singleItem && (
                                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
                                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background border border-border overflow-hidden">
                                        {singleItem.images?.[0]?.url ? (
                                            <img
                                                src={singleItem.images[0].url}
                                                alt={singleItem.name || "Product"}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Package className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {singleItem.name || "Unnamed Item"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {singleItem.itemGroup?.name ? `${singleItem.itemGroup.name} · ` : ""}
                                            {singleItem.sku ? `SKU: ${singleItem.sku}` : singleItem.code ? `Code: ${singleItem.code}` : ""} · {format(singleItem.price ?? 0)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Single Item Channels Checklist */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Allowed Sales Channels</span>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllChannels}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
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
                                            const IconComp = CHANNEL_ICONS[channel.code.toUpperCase()] || Store;

                                            return (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => toggleChannel(channel.id)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                                        isChecked
                                                            ? "border-primary/40 bg-primary/5 text-foreground shadow-2xs"
                                                            : "border-border bg-card text-muted-foreground hover:border-border/80"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`grid h-5 w-5 place-items-center rounded-md border transition-colors ${
                                                                isChecked
                                                                    ? "bg-primary border-primary text-white"
                                                                    : "border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground">{channel.name}</span>
                                                    </div>

                                                    <span
                                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                                            isChecked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
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
                            {/* LEFT COLUMN: Products Selection (7 cols) */}
                            <div className="md:col-span-7 space-y-3">
                                {/* Combined Search & Category Filter Header */}
                                <div className="flex items-center gap-2">
                                    {availableCategories.length > 0 && (
                                        <div className="relative min-w-[150px] max-w-[180px]">
                                            <button
                                                type="button"
                                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                                className="w-full h-10 px-3 flex items-center justify-between gap-1.5 text-xs font-bold rounded-xl border border-border bg-card text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                <span className="truncate">
                                                    {selectedCategory === "ALL" ? "All Categories" : selectedCategory}
                                                </span>
                                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {isCategoryOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setIsCategoryOpen(false)}
                                                    />
                                                    <div className="absolute left-0 top-11 z-50 min-w-[190px] max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl space-y-0.5 animate-in fade-in-50 zoom-in-95">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCategory("ALL");
                                                                setIsCategoryOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                                selectedCategory === "ALL"
                                                                    ? "bg-primary/10 text-primary font-bold"
                                                                    : "hover:bg-muted text-foreground"
                                                            }`}
                                                        >
                                                            <span>All Categories</span>
                                                            {selectedCategory === "ALL" && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
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
                                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                                        isSelected
                                                                            ? "bg-primary/10 text-primary font-bold"
                                                                            : "hover:bg-muted text-foreground"
                                                                    }`}
                                                                >
                                                                    <span className="truncate">{cat}</span>
                                                                    {isSelected && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search product..."
                                            value={productSearchQuery}
                                            onChange={(e) => setProductSearchQuery(e.target.value)}
                                            className="h-10 pl-9 pr-8 text-xs font-semibold rounded-xl border border-border bg-card text-foreground"
                                        />
                                        {productSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setProductSearchQuery("")}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Product List Header */}
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs font-bold text-foreground">Select Products</span>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllFilteredProducts}
                                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                    >
                                        Select All in Category
                                    </button>
                                </div>

                                {/* Spacious Clean Product List */}
                                <div className="h-72 overflow-y-auto rounded-2xl border border-border/80 bg-muted/20 p-2 space-y-1.5">
                                    {filteredProducts.length === 0 ? (
                                        <div className="py-16 text-center text-xs text-muted-foreground">
                                            No products found matching filter.
                                        </div>
                                    ) : (
                                        filteredProducts.map((item) => {
                                            const isChecked = checkedProductIds.has(item.id);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => toggleProductCheck(item.id)}
                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-xs border ${
                                                        isChecked
                                                            ? "bg-card border-primary/40 text-foreground shadow-2xs font-bold"
                                                            : "bg-card/60 border-border/50 text-muted-foreground hover:bg-card hover:border-border"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className={`grid h-4 w-4 place-items-center rounded border shrink-0 transition-colors ${
                                                                isChecked
                                                                    ? "bg-primary border-primary text-white"
                                                                    : "border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                                        </div>

                                                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted border border-border overflow-hidden">
                                                            {item.images?.[0]?.url ? (
                                                                <img
                                                                    src={item.images[0].url}
                                                                    alt={item.name || "Product"}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate font-bold text-foreground text-xs">{item.name || "Unnamed item"}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">
                                                                {item.itemGroup?.name ? `${item.itemGroup.name} · ` : ""}
                                                                {item.sku ? `SKU: ${item.sku}` : item.barcode ? `BC: ${item.barcode}` : ""}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className="text-xs font-bold text-foreground shrink-0 ml-2">
                                                        {format(item.price ?? 0)}
                                                    </span>
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
                                        <span className="text-xs font-bold text-foreground">Target Channels</span>
                                        <button
                                            type="button"
                                            onClick={toggleSelectAllChannels}
                                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            Toggle All
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {activeSalesChannels.map((channel) => {
                                            const isChecked = checkedChannelIds.has(channel.id);
                                            const IconComp = CHANNEL_ICONS[channel.code.toUpperCase()] || Store;

                                            return (
                                                <div
                                                    key={channel.id}
                                                    onClick={() => toggleChannel(channel.id)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                                        isChecked
                                                            ? "border-primary/40 bg-primary/5 text-foreground shadow-2xs font-bold"
                                                            : "border-border/60 bg-card text-muted-foreground hover:border-border"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className={`grid h-4 w-4 place-items-center rounded border shrink-0 transition-colors ${
                                                                isChecked
                                                                    ? "bg-primary border-primary text-white"
                                                                    : "border-input bg-background"
                                                            }`}
                                                        >
                                                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                                        </div>
                                                        <span className="text-xs font-bold truncate text-foreground">{channel.name}</span>
                                                    </div>

                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            isChecked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
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
                    <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl border-border font-semibold text-xs h-10 px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSaving ||
                                (initialItemId ? isSingleItemLoading : checkedProductIds.size === 0 || checkedChannelIds.size === 0)
                            }
                            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 px-6 shadow-sm cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <LoaderCircle className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Publishing...
                                </>
                            ) : initialItemId ? (
                                "Save Changes"
                            ) : (
                                "Publish Selected Products"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
