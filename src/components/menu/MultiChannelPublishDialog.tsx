"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Check,
    ChevronDown,
    Globe,
    LoaderCircle,
    MessageSquare,
    Package,
    Search,
    Send,
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
import type { InventoryItem } from "@/lib/api/inventory";

export interface SimpleSalesChannel {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
}

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
    salesChannels: SimpleSalesChannel[];
    initialItemId?: string;
    onSuccess?: (itemId?: string, channelIds?: string[]) => void;
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

    // Multi-item batch state
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
    const [productSearchQuery, setProductSearchQuery] = useState<string>("");
    const [checkedProductIds, setCheckedProductIds] = useState<Set<string>>(new Set());
    const [checkedChannelIds, setCheckedChannelIds] = useState<Set<string>>(
        new Set(activeSalesChannels.map((c) => c.id))
    );
    const [isSaving, setIsSaving] = useState(false);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedCategory("ALL");
            setIsCategoryOpen(false);
            setProductSearchQuery("");
            setCheckedProductIds(
                initialItemId ? new Set([initialItemId]) : new Set(inventoryItems.map((item) => item.id))
            );
            setCheckedChannelIds(new Set(activeSalesChannels.map((c) => c.id)));
        }
    }, [open, initialItemId, inventoryItems, activeSalesChannels]);

    // Filter products by category and search query
    const filteredProducts = useMemo(() => {
        let list = inventoryItems;

        if (selectedCategory !== "ALL") {
            list = list.filter((item) => item.itemGroup?.name?.trim() === selectedCategory);
        }

        const query = productSearchQuery.trim().toLowerCase();
        if (!query) return list;

        return list.filter(
            (item) =>
                item.name?.toLowerCase().includes(query) ||
                item.sku?.toLowerCase().includes(query) ||
                item.barcode?.toLowerCase().includes(query) ||
                item.code?.toLowerCase().includes(query)
        );
    }, [inventoryItems, selectedCategory, productSearchQuery]);

    const toggleProductCheck = (id: string) => {
        setCheckedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAllFilteredProducts = () => {
        const allFilteredIds = filteredProducts.map((p) => p.id);
        const allSelected = allFilteredIds.every((id) => checkedProductIds.has(id));

        setCheckedProductIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                allFilteredIds.forEach((id) => next.delete(id));
            } else {
                allFilteredIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const toggleChannel = (id: string) => {
        setCheckedChannelIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAllChannels = () => {
        const allChannelIds = activeSalesChannels.map((c) => c.id);
        const allSelected = allChannelIds.every((id) => checkedChannelIds.has(id));

        if (allSelected) {
            setCheckedChannelIds(new Set());
        } else {
            setCheckedChannelIds(new Set(allChannelIds));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (checkedProductIds.size === 0 || checkedChannelIds.size === 0) return;

        setIsSaving(true);
        setTimeout(() => {
            toast({
                tone: "success",
                title: "Sales Channels Updated",
                description: `Successfully published ${checkedProductIds.size} product(s) across ${checkedChannelIds.size} channel(s).`,
            });
            setIsSaving(false);
            onSuccess?.(Array.from(checkedProductIds)[0], Array.from(checkedChannelIds));
            onClose();
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl p-6 rounded-3xl sm:rounded-3xl border border-border bg-card shadow-2xl">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-lg font-bold text-foreground">
                        Select Channels by Item
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Assign items to one or multiple sales channels at once.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* LEFT COLUMN: Products Selector (7 cols) */}
                        <div className="md:col-span-7 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[140px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search product..."
                                        value={productSearchQuery}
                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                        className="h-9 pl-8 pr-7 text-xs rounded-xl border border-border bg-card"
                                    />
                                    {productSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setProductSearchQuery("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Category Filter Dropdown */}
                                {availableCategories.length > 0 && (
                                    <div className="relative shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                            className="h-9 px-3 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <span className="truncate max-w-[110px]">
                                                {selectedCategory === "ALL" ? "All Categories" : selectedCategory}
                                            </span>
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>

                                        {isCategoryOpen && (
                                            <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-border bg-card shadow-lg p-1 space-y-0.5 max-h-48 overflow-y-auto text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCategory("ALL");
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${
                                                        selectedCategory === "ALL"
                                                            ? "bg-primary/10 text-primary font-bold"
                                                            : "hover:bg-muted/60 text-foreground"
                                                    }`}
                                                >
                                                    All Categories
                                                </button>
                                                {availableCategories.map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setIsCategoryOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors truncate ${
                                                            selectedCategory === cat
                                                                ? "bg-primary/10 text-primary font-bold"
                                                                : "hover:bg-muted/60 text-foreground"
                                                        }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Product List Header */}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold text-foreground">Select Products</span>
                                <button
                                    type="button"
                                    onClick={toggleSelectAllFilteredProducts}
                                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                >
                                    Select All
                                </button>
                            </div>

                            {/* Product List */}
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
                                                            {item.sku ? `SKU: ${item.sku}` : item.code ? `Code: ${item.code}` : ""}
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
                            disabled={isSaving || checkedProductIds.size === 0 || checkedChannelIds.size === 0}
                            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 px-6 shadow-sm cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <LoaderCircle className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Publishing...
                                </>
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
