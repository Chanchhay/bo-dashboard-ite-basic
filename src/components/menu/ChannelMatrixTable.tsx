"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Check,
    CheckSquare,
    Globe,
    LoaderCircle,
    MessageSquare,
    Package,
    Plus,
    ScanBarcode,
    Search,
    Send,
    Sparkles,
    Store,
    Trash2,
    X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColumnSelectDropdown, type ColumnConfig } from "@/components/ui/ColumnSelectDropdown";
import { BarcodeScannerDialog } from "@/components/inventory/BarcodeScannerDialog";
import { useMoney } from "@/hooks/useMoney";
import { useToast } from "@/components/ui/toast";
import type { InventoryItem } from "@/lib/api/inventory";
import type { SimpleSalesChannel } from "./MultiChannelPublishDialog";

const CHANNEL_ICONS: Record<
    string,
    { name: string; icon: React.ElementType; color: string; bg: string }
> = {
    POS: { name: "Point of Sale (POS)", icon: Store, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
    TELEGRAM: { name: "Telegram Bot", icon: Send, color: "text-sky-700 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800" },
    MESSENGER: { name: "Facebook Messenger", icon: MessageSquare, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" },
    ONLINE: { name: "Online Store", icon: Globe, color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
    WEB: { name: "Web Store", icon: Globe, color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
};

interface ChannelMatrixTableProps {
    channels: SimpleSalesChannel[];
    inventoryItems: InventoryItem[];
    inventoryLoading?: boolean;
    publishedState?: Record<string, Set<string>>;
    onToggleChannelState?: (itemId: string, channelCode: string) => void;
    onRefresh?: () => void;
    onManageItemChannels?: (itemId: string) => void;
    onRemoveItemFromChannels?: (itemId: string) => void;
    onOpenMultiChannelDialog?: (itemId?: string) => void;
}

export function ChannelMatrixTable({
    channels,
    inventoryItems,
    inventoryLoading = false,
    publishedState,
    onToggleChannelState,
    onRefresh,
    onManageItemChannels,
    onRemoveItemFromChannels,
    onOpenMultiChannelDialog,
}: ChannelMatrixTableProps) {
    const { format } = useMoney();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Visible channel columns state
    const [visibleChannelIds, setVisibleChannelIds] = useState<Set<string>>(
        new Set(channels.map((c) => c.id))
    );

    useEffect(() => {
        if (channels.length > 0) {
            setVisibleChannelIds(new Set(channels.map((c) => c.id)));
        }
    }, [channels]);

    // Column configs for ColumnSelectDropdown
    const columnConfigs: ColumnConfig[] = useMemo(
        () =>
            channels.map((ch) => ({
                id: ch.id,
                label: ch.name,
                visible: visibleChannelIds.has(ch.id),
            })),
        [channels, visibleChannelIds]
    );

    const toggleChannelColumn = (channelId: string) => {
        setVisibleChannelIds((prev) => {
            const next = new Set(prev);
            if (next.has(channelId)) {
                if (next.size > 1) next.delete(channelId);
            } else {
                next.add(channelId);
            }
            return next;
        });
    };

    const resetColumns = () => {
        setVisibleChannelIds(new Set(channels.map((c) => c.id)));
    };

    // Toggle item on specific channel
    const handleToggleChannel = (item: InventoryItem, channel: SimpleSalesChannel) => {
        if (onToggleChannelState) {
            onToggleChannelState(item.id, channel.code);
            const isCurrentlyActive = publishedState?.[channel.code]?.has(item.id);
            toast({
                tone: isCurrentlyActive ? "info" : "success",
                title: isCurrentlyActive ? `Removed from ${channel.name}` : `Added to ${channel.name}`,
                description: `${item.name || "Item"} set to ${isCurrentlyActive ? "Inactive" : "Active"}.`,
            });
        }
    };

    const handleRemoveClick = (itemId: string) => {
        onRemoveItemFromChannels?.(itemId);
    };

    const handleManageChannelsClick = (itemId: string) => {
        onManageItemChannels?.(itemId);
    };

    // Filtered inventory items for matrix display
    const displayedItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return inventoryItems;

        return inventoryItems.filter(
            (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.barcode?.toLowerCase().includes(q) ||
                item.code?.toLowerCase().includes(q)
        );
    }, [inventoryItems, searchQuery]);

    // Filtered visible channels
    const visibleChannels = useMemo(
        () => channels.filter((c) => visibleChannelIds.has(c.id)),
        [channels, visibleChannelIds]
    );

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] space-y-0">
            {/* Barcode Scanner Modal Dialog */}
            <BarcodeScannerDialog
                open={isScannerOpen}
                onOpenChange={setIsScannerOpen}
                onItemFound={(item) => {
                    handleManageChannelsClick(item.id);
                    setIsScannerOpen(false);
                }}
            />

            {/* Header Toolbar matching reference screenshot */}
            <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                {/* Search Bar + Barcode Scan Button */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search name, SKU, or scan barcode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 pl-9 pr-9 text-sm rounded-xl border border-border bg-card"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Small Barcode Scanner Button */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsScannerOpen(true)}
                        title="Scan product barcode"
                        className="h-10 px-3 rounded-xl border border-border bg-card text-foreground hover:bg-muted/80 shrink-0 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                        <ScanBarcode className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Scan</span>
                    </Button>
                </div>

                {/* Actions: ColumnSelectDropdown + Add Item to Channel */}
                <div className="flex items-center gap-2 shrink-0">
                    <ColumnSelectDropdown
                        columns={columnConfigs}
                        onToggleColumn={toggleChannelColumn}
                        onResetDefaults={resetColumns}
                    />

                    {onOpenMultiChannelDialog && (
                        <Button
                            type="button"
                            onClick={() => onOpenMultiChannelDialog()}
                            className="h-10 px-4 rounded-xl font-bold text-xs bg-primary text-white hover:bg-primary/90 shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Item to Channel</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Matrix Table */}
            {inventoryLoading ? (
                <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading sales channels & products...
                </div>
            ) : displayedItems.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-foreground">No products found</p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                            Try adjusting your search query or add new items to channels.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-muted/50 text-xs font-bold text-foreground uppercase tracking-wider border-b border-border">
                            <tr>
                                <th className="px-5 py-3.5 w-[280px]">Product Info</th>
                                <th className="px-5 py-3.5 w-[110px]">Price</th>

                                {/* Dynamic Visible Sales Channel Columns */}
                                {visibleChannels.map((channel) => {
                                    const codeUpper = channel.code.toUpperCase();
                                    const meta = CHANNEL_ICONS[codeUpper] || {
                                        name: channel.code,
                                        icon: Store,
                                        color: "text-primary",
                                        bg: "bg-primary/10 border-primary/20",
                                    };
                                    const channelHeadingName = channel.name || meta.name || channel.code;

                                    return (
                                        <th
                                            key={channel.id}
                                            className="px-5 py-3.5 text-center min-w-[140px]"
                                        >
                                            <div className="inline-flex items-center gap-1.5 justify-center font-bold text-foreground">
                                                <span>{channelHeadingName}</span>
                                            </div>
                                        </th>
                                    );
                                })}

                                <th className="px-5 py-3.5 text-center min-w-[120px]">Channels</th>
                                <th className="px-5 py-3.5 text-right w-[80px]">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {displayedItems.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                                    {/* Product Details */}
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted border border-border overflow-hidden">
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
                                                <p className="font-bold text-foreground truncate text-xs">
                                                    {item.name || "Unnamed item"}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {item.sku ? `SKU: ${item.sku}` : item.code ? `Code: ${item.code}` : item.barcode ? `BC: ${item.barcode}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Price */}
                                    <td className="px-5 py-3.5 font-bold text-xs text-foreground">
                                        {item.price != null && item.price > 0 ? format(item.price) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-normal">Unpriced</span>
                                        )}
                                    </td>

                                    {/* Visible Channel Columns with Cell Status */}
                                    {visibleChannels.map((channel) => {
                                        const isActiveOnChannel = Boolean(publishedState?.[channel.code]?.has(item.id));

                                        return (
                                            <td key={`${item.id}_${channel.id}`} className="px-5 py-3.5 text-center align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleChannel(item, channel)}
                                                    title={
                                                        isActiveOnChannel
                                                            ? `Active on ${channel.name}. Click to set Inactive.`
                                                            : `Inactive on ${channel.name}. Click to set Active.`
                                                    }
                                                    className="inline-flex items-center justify-center transition-all cursor-pointer"
                                                >
                                                    {isActiveOnChannel ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success hover:bg-success/20 transition-colors cursor-pointer">
                                                            <Check className="h-3.5 w-3.5" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}

                                    {/* Dedicated Channels Column */}
                                    <td className="px-5 py-3.5 text-center">
                                        {onManageItemChannels && (
                                            <button
                                                type="button"
                                                onClick={() => handleManageChannelsClick(item.id)}
                                                title="Manage channels for this item"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                                            >
                                                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                                Channels
                                            </button>
                                        )}
                                    </td>

                                    {/* Dedicated Actions Column */}
                                    <td className="px-5 py-3.5 text-right">
                                        {onRemoveItemFromChannels && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveClick(item.id)}
                                                title="Remove item from sales channels"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition shrink-0 cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Remove</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
