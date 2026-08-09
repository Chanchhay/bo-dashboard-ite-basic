"use client";

import { useMemo, useState } from "react";
import { useMoney } from "@/hooks/useMoney";
import { Check, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X, Barcode, Package, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    InventoryEmpty,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import type { InventoryItem } from "@/lib/api/inventory";

interface ItemChannelTableProps {
    activeChannelCode: string;
    selectedChannelCode?: string;
    searchQuery: string;
    inventoryLoading: boolean;
    inventoryItems: InventoryItem[];
    publishedItemIds: Set<string>;
    pendingItemId: string;
    onSearchChange: (value: string) => void;
    onRefresh: () => void;
    onPublish: (itemId: string) => void;
    onUnpublish: (itemId: string) => void;
    onManageItemChannels?: (itemId: string) => void;
}

export function ItemChannelTable({
    activeChannelCode,
    selectedChannelCode,
    searchQuery,
    inventoryLoading,
    inventoryItems,
    publishedItemIds,
    pendingItemId,
    onSearchChange,
    onRefresh,
    onPublish,
    onUnpublish,
    onManageItemChannels,
}: ItemChannelTableProps) {
    const { format } = useMoney();
    const channelLabel = selectedChannelCode || activeChannelCode;

    // View tab: "PUBLISHED" (default) or "ALL"
    const [viewTab, setViewTab] = useState<"PUBLISHED" | "ALL">("PUBLISHED");

    // Quick add search/barcode input
    const [addSearchQuery, setAddSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Published items list
    const publishedItems = useMemo(
        () => inventoryItems.filter((item) => publishedItemIds.has(item.id)),
        [inventoryItems, publishedItemIds]
    );

    // Items to display in the main table based on selected tab & search filter
    const displayedItems = useMemo(() => {
        const baseItems = viewTab === "PUBLISHED" ? publishedItems : inventoryItems;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return baseItems;

        return baseItems.filter(
            (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.code?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.barcode?.toLowerCase().includes(q)
        );
    }, [viewTab, publishedItems, inventoryItems, searchQuery]);

    // Matching items for Quick-Add Bar
    const quickAddMatches = useMemo(() => {
        const q = addSearchQuery.trim().toLowerCase();
        if (!q) return [];

        return inventoryItems
            .filter(
                (item) =>
                    item.name?.toLowerCase().includes(q) ||
                    item.code?.toLowerCase().includes(q) ||
                    item.sku?.toLowerCase().includes(q) ||
                    item.barcode?.toLowerCase().includes(q)
            )
            .slice(0, 6);
    }, [inventoryItems, addSearchQuery]);

    // Auto add on exact barcode match
    const handleAddBarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && quickAddMatches.length > 0) {
            const firstMatch = quickAddMatches[0];
            if (!publishedItemIds.has(firstMatch.id)) {
                onPublish(firstMatch.id);
                setAddSearchQuery("");
            }
        }
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-0">
            {/* Quick Add / Search & Barcode Scan Header Bar */}
            <div className="p-4 border-b border-border bg-muted/20 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-xl">
                        <div className="relative">
                            <Barcode className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary" />
                            <Input
                                placeholder={`Search name, SKU, or scan barcode to add to ${channelLabel}...`}
                                value={addSearchQuery}
                                onChange={(e) => setAddSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onKeyDown={handleAddBarKeyDown}
                                className="h-11 pl-9 pr-4 text-xs font-semibold rounded-xl border-primary/30 bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            {addSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setAddSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Quick Add Results Dropdown Preview */}
                        {addSearchQuery && quickAddMatches.length > 0 && (
                            <div className="absolute left-0 right-0 top-12 z-20 rounded-xl border border-border bg-popover p-2 shadow-lg space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                                    Catalog Matches ({quickAddMatches.length})
                                </p>
                                {quickAddMatches.map((item) => {
                                    const isAlreadyOnChannel = publishedItemIds.has(item.id);
                                    const isPending = pendingItemId === item.id;

                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-xs"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-foreground truncate">{item.name || "Unnamed"}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {item.sku ? `SKU: ${item.sku}` : item.barcode ? `BC: ${item.barcode}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-bold text-foreground">{format(item.price ?? 0)}</span>
                                                {isAlreadyOnChannel ? (
                                                    <span className="text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <Check className="h-3 w-3" /> Added
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        disabled={isPending}
                                                        onClick={() => {
                                                            onPublish(item.id);
                                                            setAddSearchQuery("");
                                                        }}
                                                        className="h-7 px-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-lg"
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" /> Add to {channelLabel}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* View Filter Tabs: Published Only vs All Catalog */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex rounded-xl bg-muted p-1 border border-border">
                            <button
                                type="button"
                                onClick={() => setViewTab("PUBLISHED")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewTab === "PUBLISHED"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                On {channelLabel} ({publishedItems.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewTab("ALL")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewTab === "ALL"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                All Catalog ({inventoryItems.length})
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onRefresh}
                            title="Refresh channels"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition shadow-xs"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span className="sr-only">Refresh channels</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Search Filter Bar */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card">
                <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={`Filter items on ${channelLabel}...`}
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="h-8 pl-8 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                    Showing <strong className="text-foreground">{displayedItems.length}</strong> product(s)
                </p>
            </div>

            {/* Table or Empty State */}
            {inventoryLoading ? (
                <InventoryLoading label="Loading products..." />
            ) : displayedItems.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-foreground">
                            {viewTab === "PUBLISHED"
                                ? `No products published on ${channelLabel} yet`
                                : "No products found"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                            {viewTab === "PUBLISHED"
                                ? `Use the barcode scanner or search box above to add your first product to ${channelLabel}.`
                                : "Try adjusting your search criteria."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-190 text-left text-sm">
                        <thead className="bg-muted/40 text-sm font-bold tracking-wide text-foreground uppercase">
                            <tr>
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {displayedItems.map((item) => {
                                const isPublished = publishedItemIds.has(item.id);
                                const isPending = pendingItemId === item.id;

                                return (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-muted/50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="min-w-0">
                                                <p className="text-base font-bold text-foreground truncate">
                                                    {item.name || "Unnamed item"}
                                                </p>
                                                {(item.itemGroup?.name || item.category?.name) && (
                                                    <p className="text-xs font-semibold text-muted-foreground truncate mt-0.5">
                                                        {item.itemGroup?.name || item.category?.name}
                                                    </p>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            {isPublished ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Published on {channelLabel}
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                                    Not on {channelLabel}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {onManageItemChannels && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onManageItemChannels(item.id)}
                                                        title="Manage channels for this item"
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
                                                    >
                                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                                        Channels
                                                    </button>
                                                )}

                                                {isPublished ? (
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() => onUnpublish(item.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
                                                    >
                                                        {isPending ? (
                                                            "Removing..."
                                                        ) : (
                                                            <>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Remove
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() => onPublish(item.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-bold text-success hover:bg-success/20 transition disabled:opacity-50"
                                                    >
                                                        {isPending ? (
                                                            "Adding..."
                                                        ) : (
                                                            <>
                                                                <Plus className="h-3.5 w-3.5" />
                                                                Add
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
